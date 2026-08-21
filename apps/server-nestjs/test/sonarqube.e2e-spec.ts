import type { ConfigType } from '@nestjs/config'
import type { TestingModule } from '@nestjs/testing'
import { generateProjectKey } from '@cpn-console/hooks'
import { faker } from '@faker-js/faker'
import { ConfigModule } from '@nestjs/config'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { Test } from '@nestjs/testing'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { baseConfigFactory } from '../src/config/base.config'
import { AuthModule } from '../src/modules/infrastructure/auth/auth.module'
import { DatabaseModule } from '../src/modules/infrastructure/database/database.module'
import { PrismaService } from '../src/modules/infrastructure/database/prisma.service'
import { EventsModule } from '../src/modules/infrastructure/events/events.module'
import { LoggerModule } from '../src/modules/infrastructure/logger/logger.module'
import { PermissionModule } from '../src/modules/infrastructure/permission/permission.module'
import { SonarqubeClientService } from '../src/modules/sonarqube/sonarqube-client.service'
import { projectSelect } from '../src/modules/sonarqube/sonarqube-datastore.service'
import { makeProjectWithDetails } from '../src/modules/sonarqube/sonarqube-testing.utils'
import { SonarqubeModule } from '../src/modules/sonarqube/sonarqube.module'
import { SonarqubeService } from '../src/modules/sonarqube/sonarqube.service'
import { GitlabClientService } from '../src/modules/gitlab/gitlab-client.service'
import { gitlabConfigFactory } from '../src/config/gitlab.config'
import { GitlabModule } from '../src/modules/gitlab/gitlab.module'
import { VaultClientService } from '../src/modules/vault/vault-client.service'
import { VaultModule } from '../src/modules/vault/vault.module'
import { getDotenvPaths } from '../src/utils/dotenv.utils'
import { getAll } from '../src/utils/iterable.utils'
import { SONARQUBE_PROJECT_TIMEOUT } from './e2e-timeout'

const canRunSonarqubeE2E
  = Boolean(process.env.E2E)

const describeWithSonarqube = describe.runIf(canRunSonarqubeE2E)

describeWithSonarqube('SonarqubeService (e2e)', () => {
  let moduleRef: TestingModule
  let eventEmitter: EventEmitter2
  let sonarqubeService: SonarqubeService
  let sonarqubeClient: SonarqubeClientService
  let vaultService: VaultClientService
  let gitlabClient: GitlabClientService
  let gitlabConfig: ConfigType<typeof gitlabConfigFactory>
  let prisma: PrismaService

  let ownerId: string
  let testProjectId: string
  let testProjectSlug: string
  let testRepoName: string

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [SonarqubeModule, GitlabModule, VaultModule, ConfigModule.forRoot({ envFilePath: getDotenvPaths(), isGlobal: true, load: [baseConfigFactory, gitlabConfigFactory] }), AuthModule, DatabaseModule, EventsModule, LoggerModule, PermissionModule],
    }).compile()

    await moduleRef.init()

    sonarqubeService = moduleRef.get<SonarqubeService>(SonarqubeService)
    sonarqubeClient = moduleRef.get<SonarqubeClientService>(SonarqubeClientService)
    vaultService = moduleRef.get<VaultClientService>(VaultClientService)
    gitlabClient = moduleRef.get<GitlabClientService>(GitlabClientService)
    gitlabConfig = moduleRef.get<ConfigType<typeof gitlabConfigFactory>>(gitlabConfigFactory.KEY)
    prisma = moduleRef.get<PrismaService>(PrismaService)
    eventEmitter = moduleRef.get<EventEmitter2>(EventEmitter2)

    ownerId = faker.string.uuid()
    testProjectId = faker.string.uuid()
    testProjectSlug = faker.helpers.slugify(`test-sonar-${faker.string.alphanumeric(8).toLowerCase()}`)
    testRepoName = faker.helpers.slugify(`test-sonar-${faker.string.alphanumeric(8).toLowerCase()}`)

    await prisma.user.create({
      data: {
        id: ownerId,
        email: faker.internet.email().toLowerCase(),
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        type: 'human',
      },
    })
  })

  afterAll(async () => {
    if (sonarqubeService && testProjectSlug) {
      await eventEmitter.emitAsync('project.delete', makeProjectWithDetails({ slug: testProjectSlug, repositories: [] })).catch(() => {})
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
      sonarqubeClient.searchUserGroup({ q: '/console/admin' }),
      sonarqubeClient.searchUserGroup({ q: '/console/readonly' }),
      sonarqubeClient.searchUserGroup({ q: '/console/security' }),
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

    await eventEmitter.emitAsync('project.upsert', project)

    // All 5 project role groups should exist in SonarQube
    const projectGroupNames = [
      `/${testProjectSlug}/console/admin`,
      `/${testProjectSlug}/console/devops`,
      `/${testProjectSlug}/console/developer`,
      `/${testProjectSlug}/console/security`,
      `/${testProjectSlug}/console/readonly`,
    ]
    for (const groupName of projectGroupNames) {
      const result = await sonarqubeClient.searchUserGroup({ q: groupName })
      expect(result.groups.some(g => g.name === groupName), `group ${groupName} should exist`).toBe(true)
    }

    // Robot/CI user should exist
    const usersResult = await getAll(sonarqubeClient.searchUsers({ q: testProjectSlug }))
    expect(usersResult.some(u => u.login === testProjectSlug)).toBe(true)

    // SonarQube analysis project for the repository should exist
    const projectKey = generateProjectKey(testProjectSlug, testRepoName)
    const projectsResult = await getAll(sonarqubeClient.searchProject({ q: testProjectSlug }))
    expect(projectsResult.some(p => p.key === projectKey)).toBe(true)

    // Vault credentials should be written with correct username and token
    const vaultSecret = await vaultService.readSonarqubeUser(testProjectSlug)
    expect(vaultSecret?.data?.SONAR_USERNAME).toBe(testProjectSlug)
    expect(vaultSecret?.data?.SONAR_TOKEN).toBeTruthy()
    expect(vaultSecret?.data?.SONAR_PASSWORD).toBeTruthy()

    // SONAR_TOKEN must be exposed at the project GitLab group level so every repo inherits it
    const sonarGroupPath = `${gitlabConfig.projectRootDir}/${testProjectSlug}`
    const sonarGroup = (gitlabClient.getGroupByPath
      ? await gitlabClient.getGroupByPath(sonarGroupPath)
      : undefined) ?? await gitlabClient.getProjectGroup(testProjectSlug)
    if (!sonarGroup) throw new Error(`GitLab group ${sonarGroupPath} not found`)
    const groupVar = await gitlabClient.readGroupVariable(sonarGroup.id, 'SONAR_TOKEN')
    expect(groupVar?.value).toBe(vaultSecret?.data?.SONAR_TOKEN)
    expect(groupVar?.masked).toBe(true)

    // Per-repo CI variables must be provisioned for the repository
    const sonarProjectKey = generateProjectKey(testProjectSlug, testRepoName)
    const repo = await gitlabClient.getOrCreateProjectGroupRepo(testProjectSlug, `${testProjectSlug}/${testRepoName}`)
    const repoVars = await gitlabClient.readProjectVariables(repo.id, '*')
    const expectedRepoVars = ['PROJECT_KEY', 'PROJECT_NAME', 'SONAR_PROJECT_PROPERTIES', 'SONAR_TOKEN']
    for (const key of expectedRepoVars) {
      const variable = repoVars.find(v => v.key === key)
      expect(variable, `repo CI variable ${key} should exist`).toBeTruthy()
    }
    expect(repoVars.find(v => v.key === 'PROJECT_KEY')?.value).toBe(sonarProjectKey)
    expect(repoVars.find(v => v.key === 'SONAR_TOKEN')?.value).toBe(vaultSecret?.data?.SONAR_TOKEN)
  }, SONARQUBE_PROJECT_TIMEOUT)

  it('should delete the project from SonarQube and remove vault credentials', async () => {
    const project = await prisma.project.findUniqueOrThrow({
      where: { id: testProjectId },
      select: projectSelect,
    })

    const projectKey = generateProjectKey(testProjectSlug, testRepoName)
    const projectsBefore = await getAll(sonarqubeClient.searchProject({ q: testProjectSlug }))
    expect(projectsBefore.some(p => p.key === projectKey)).toBe(true)

    await eventEmitter.emitAsync('project.delete', project)

    // SonarQube analysis project should be removed
    const projectsResult = await getAll(sonarqubeClient.searchProject({ q: testProjectSlug }))
    expect(projectsResult.some(p => p.key === projectKey)).toBe(false)

    // Vault credentials should be removed
    const vaultSecret = await vaultService.readSonarqubeUser(testProjectSlug)
    expect(vaultSecret).toBeNull()
  }, SONARQUBE_PROJECT_TIMEOUT)
})
