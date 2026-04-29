import type { TestingModule } from '@nestjs/testing'
import { faker } from '@faker-js/faker'
import { Test } from '@nestjs/testing'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { ConfigurationModule } from '../src/modules/infrastructure/configuration/configuration.module'
import { PrismaService } from '../src/modules/infrastructure/database/prisma.service'
import { InfrastructureModule } from '../src/modules/infrastructure/infrastructure.module'
import { SonarqubeClientService } from '../src/modules/sonarqube/sonarqube-client.service'
import { projectSelect } from '../src/modules/sonarqube/sonarqube-datastore.service'
import { makeProjectWithDetails } from '../src/modules/sonarqube/sonarqube-testing.utils'
import { SonarqubeModule } from '../src/modules/sonarqube/sonarqube.module'
import { SonarqubeService } from '../src/modules/sonarqube/sonarqube.service'
import { generateProjectKey } from '../src/modules/sonarqube/sonarqube.utils'
import { VaultClientService } from '../src/modules/vault/vault-client.service'
import { VaultModule } from '../src/modules/vault/vault.module'

const canRunSonarqubeE2E
  = Boolean(process.env.E2E)
    && Boolean(process.env.SONARQUBE_URL)
    && Boolean(process.env.SONARQUBE_TOKEN)
    && Boolean(process.env.VAULT_URL)
    && Boolean(process.env.VAULT_TOKEN)
    && Boolean(process.env.DB_URL)

const describeWithSonarqube = describe.runIf(canRunSonarqubeE2E)

describeWithSonarqube('SonarqubeService (e2e)', () => {
  let moduleRef: TestingModule
  let sonarqubeService: SonarqubeService
  let sonarqubeClient: SonarqubeClientService
  let vaultService: VaultClientService
  let prisma: PrismaService

  let ownerId: string
  let testProjectId: string
  let testProjectSlug: string
  const testRepoName = 'app'

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [SonarqubeModule, VaultModule, ConfigurationModule, InfrastructureModule],
    }).compile()

    await moduleRef.init()

    sonarqubeService = moduleRef.get<SonarqubeService>(SonarqubeService)
    sonarqubeClient = moduleRef.get<SonarqubeClientService>(SonarqubeClientService)
    vaultService = moduleRef.get<VaultClientService>(VaultClientService)
    prisma = moduleRef.get<PrismaService>(PrismaService)

    ownerId = faker.string.uuid()
    testProjectId = faker.string.uuid()
    testProjectSlug = faker.helpers.slugify(`test-sonar-${faker.string.alphanumeric(8).toLowerCase()}`)

    await prisma.user.create({
      data: {
        id: ownerId,
        email: faker.internet.email().toLowerCase(),
        firstName: 'Test',
        lastName: 'Owner',
        type: 'human',
      },
    })
  })

  afterAll(async () => {
    if (sonarqubeService && testProjectSlug) {
      await sonarqubeService.handleDelete(
        makeProjectWithDetails({ slug: testProjectSlug, repositories: [] }),
      ).catch(() => {})
    }

    if (prisma) {
      await prisma.repository.deleteMany({ where: { projectId: testProjectId } }).catch(() => {})
      await prisma.project.deleteMany({ where: { id: testProjectId } }).catch(() => {})
      await prisma.user.deleteMany({ where: { id: ownerId } }).catch(() => {})
    }

    await moduleRef?.close()
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  it('should create platform groups during initialization', async () => {
    // init() is triggered by moduleRef.init() via onModuleInit — groups must already exist
    const [adminResult, readonlyResult, securityResult] = await Promise.all([
      sonarqubeClient.searchUserGroups({ q: '/console/admin' }),
      sonarqubeClient.searchUserGroups({ q: '/console/readonly' }),
      sonarqubeClient.searchUserGroups({ q: '/console/security' }),
    ])

    expect(adminResult.groups.some(g => g.name === '/console/admin')).toBe(true)
    expect(readonlyResult.groups.some(g => g.name === '/console/readonly')).toBe(true)
    expect(securityResult.groups.some(g => g.name === '/console/security')).toBe(true)
  })

  it('should reconcile project in SonarQube (groups, user, repository, vault secret)', async () => {
    await prisma.project.create({
      data: {
        id: testProjectId,
        slug: testProjectSlug,
        name: testProjectSlug,
        ownerId,
        description: 'E2E SonarQube Test Project',
        hprodCpu: 0,
        hprodGpu: 0,
        hprodMemory: 0,
        prodCpu: 0,
        prodGpu: 0,
        prodMemory: 0,
      },
    })

    await prisma.repository.create({
      data: {
        projectId: testProjectId,
        internalRepoName: testRepoName,
        isPrivate: false,
      },
    })

    const project = await prisma.project.findUniqueOrThrow({
      where: { id: testProjectId },
      select: projectSelect,
    })

    await sonarqubeService.handleUpsert(project)

    // All 5 project role groups should exist in SonarQube
    const projectGroupNames = [
      `/${testProjectSlug}/console/admin`,
      `/${testProjectSlug}/console/devops`,
      `/${testProjectSlug}/console/developer`,
      `/${testProjectSlug}/console/security`,
      `/${testProjectSlug}/console/readonly`,
    ]
    for (const groupName of projectGroupNames) {
      const result = await sonarqubeClient.searchUserGroups({ q: groupName })
      expect(result.groups.some(g => g.name === groupName), `group ${groupName} should exist`).toBe(true)
    }

    // Robot/CI user should exist
    const usersResult = await sonarqubeClient.searchUsers({ q: testProjectSlug })
    expect(usersResult.users.some(u => u.login === testProjectSlug)).toBe(true)

    // SonarQube analysis project for the repository should exist
    const projectKey = generateProjectKey(testProjectSlug, testRepoName)
    const projectsResult = await sonarqubeClient.searchProject({ q: testProjectSlug })
    expect(projectsResult.components.some(p => p.key === projectKey)).toBe(true)

    // Vault credentials should be written with correct username and token
    const vaultSecret = await vaultService.readSonarqubeUser(testProjectSlug)
    expect(vaultSecret?.data?.SONAR_USERNAME).toBe(testProjectSlug)
    expect(vaultSecret?.data?.SONAR_TOKEN).toBeTruthy()
    expect(vaultSecret?.data?.SONAR_PASSWORD).toBeTruthy()
  }, 30000)

  it('should be idempotent — calling handleUpsert twice does not fail', async () => {
    const project = await prisma.project.findUniqueOrThrow({
      where: { id: testProjectId },
      select: projectSelect,
    })

    await expect(sonarqubeService.handleUpsert(project)).resolves.not.toThrow()
  }, 30000)

  it('should delete the project from SonarQube and remove vault credentials', async () => {
    const project = await prisma.project.findUniqueOrThrow({
      where: { id: testProjectId },
      select: projectSelect,
    })

    await sonarqubeService.handleDelete(project)

    // SonarQube analysis project should be removed
    const projectKey = generateProjectKey(testProjectSlug, testRepoName)
    const projectsResult = await sonarqubeClient.searchProject({ q: testProjectSlug })
    expect(projectsResult.components.some(p => p.key === projectKey)).toBe(false)

    // Vault credentials should be removed
    const vaultSecret = await vaultService.readSonarqubeUser(testProjectSlug)
    expect(vaultSecret).toBeNull()
  }, 30000)
})
