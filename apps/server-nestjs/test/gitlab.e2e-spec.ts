import type { ExpandedUserSchema, Gitlab } from '@gitbeaker/core'
import type { TestingModule } from '@nestjs/testing'
import { faker } from '@faker-js/faker'
import { Test } from '@nestjs/testing'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import z from 'zod'
import { ConfigurationModule } from '../src/cpin-module/infrastructure/configuration/configuration.module'
import { ConfigurationService } from '../src/cpin-module/infrastructure/configuration/configuration.service'
import { PrismaService } from '../src/cpin-module/infrastructure/database/prisma.service'
import { InfrastructureModule } from '../src/cpin-module/infrastructure/infrastructure.module'
import { GITLAB_REST_CLIENT, GitlabClientService } from '../src/modules/gitlab/gitlab-client.service'
import { projectSelect } from '../src/modules/gitlab/gitlab-datastore.service'
import { GitlabModule } from '../src/modules/gitlab/gitlab.module'
import { GitlabService } from '../src/modules/gitlab/gitlab.service'
import { VaultClientService } from '../src/modules/vault/vault-client.service'

const canRunGitlabE2E
  = Boolean(process.env.E2E)
    && Boolean(process.env.GITLAB_URL)
    && Boolean(process.env.GITLAB_TOKEN)
    && Boolean(process.env.VAULT_URL)
    && Boolean(process.env.VAULT_TOKEN)
    && Boolean(process.env.PROJECTS_ROOT_DIR)
    && Boolean(process.env.DB_URL)

const describeWithGitLab = describe.runIf(canRunGitlabE2E)

describeWithGitLab('GitlabController (e2e)', {}, () => {
  let moduleRef: TestingModule
  let gitlabController: GitlabService
  let gitlabService: GitlabClientService
  let gitlabClient: Gitlab
  let vaultService: VaultClientService
  let prisma: PrismaService
  let config: ConfigurationService

  let testProjectId: string
  let testProjectSlug: string
  let ownerId: string
  let ownerUser: ExpandedUserSchema

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [GitlabModule, ConfigurationModule, InfrastructureModule],
    }).compile()

    await moduleRef.init()

    gitlabController = moduleRef.get<GitlabService>(GitlabService)
    gitlabService = moduleRef.get<GitlabClientService>(GitlabClientService)
    gitlabClient = moduleRef.get<Gitlab>(GITLAB_REST_CLIENT)
    vaultService = moduleRef.get<VaultClientService>(VaultClientService)
    prisma = moduleRef.get<PrismaService>(PrismaService)
    config = moduleRef.get<ConfigurationService>(ConfigurationService)

    ownerId = faker.string.uuid()
    testProjectId = faker.string.uuid()
    testProjectSlug = faker.helpers.slugify(`test-project-${faker.string.uuid()}`)

    const ownerEmail = `test-owner-${ownerId}@example.com`

    // Create owner in GitLab
    ownerUser = await gitlabClient.Users.create({
      name: 'Test Owner',
      password: faker.internet.password({ length: 24 }),
      username: `test-owner-${ownerId}`,
      email: ownerEmail,
      skipConfirmation: true,
    })

    // Create owner in DB
    await prisma.user.create({
      data: {
        id: ownerId,
        email: ownerUser.email.toLowerCase(),
        firstName: 'Test',
        lastName: 'Owner',
        type: 'human',
      },
    })
  })

  afterAll(async () => {
    // Clean GitLab group
    if (testProjectSlug && config.projectRootPath) {
      const fullPath = `${config.projectRootPath}/${testProjectSlug}`
      const group = await gitlabService.getGroupByPath(fullPath)
      if (group) {
        await gitlabService.deleteGroup(group).catch(() => {})
      }
    }

    // Clean Vault
    if (testProjectSlug && config.projectRootPath) {
      const vaultPath = `${config.projectRootPath}/${testProjectSlug}`
      await vaultService.delete(`${vaultPath}/tech/GITLAB_MIRROR`).catch(() => {})
      await vaultService.delete(`${vaultPath}/app-mirror`).catch(() => {})
    }

    // Clean DB
    if (prisma) {
      await prisma.projectMembers.deleteMany({ where: { projectId: testProjectId } }).catch(() => {})
      await prisma.project.deleteMany({ where: { id: testProjectId } }).catch(() => {})
      await prisma.user.deleteMany({ where: { id: ownerId } }).catch(() => {})
    }

    await moduleRef.close()

    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  it('should reconcile and create project group in GitLab and Vault secrets', async () => {
    // Create Project in DB
    await prisma.project.create({
      data: {
        id: testProjectId,
        slug: testProjectSlug,
        name: testProjectSlug,
        ownerId,
        description: 'E2E Test Project',
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
        internalRepoName: 'app',
        externalRepoUrl: 'https://example.com/example.git',
        isPrivate: false,
      },
    })

    const project = await prisma.project.findUniqueOrThrow({
      where: { id: testProjectId },
      select: projectSelect,
    })

    // Act
    await gitlabController.handleUpsert(project)

    // Assert
    const groupPath = `${config.projectRootPath}/${testProjectSlug}`
    const group = z.object({
      id: z.number(),
      name: z.string(),
      full_path: z.string(),
      web_url: z.string(),
    }).parse(await gitlabService.getGroupByPath(groupPath))
    expect(group.full_path).toBe(groupPath)

    // Check membership
    const members = await gitlabService.getGroupMembers(group)
    const isMember = members.some(m => m.id === ownerUser.id)
    expect(isMember).toBe(true)

    const repoVaultPath = `${config.projectRootPath}/${testProjectSlug}/app-mirror`
    const repoSecret = await vaultService.read(repoVaultPath)
    expect(repoSecret?.data?.GIT_OUTPUT_USER).toBeTruthy()
    expect(repoSecret?.data?.GIT_OUTPUT_PASSWORD).toBeTruthy()
  }, 72000)

  it('should add member to GitLab group when added in DB', async () => {
    // Create user in GitLab
    const newUserId = faker.string.uuid()
    const newUser = await gitlabClient.Users.create({
      email: faker.internet.email().toLowerCase(),
      username: faker.internet.username(),
      name: `${faker.person.firstName()} ${faker.person.lastName()}`,
      password: faker.internet.password({ length: 24 }),
      skipConfirmation: true,
    })

    // Create user in DB
    await prisma.user.create({
      data: {
        id: newUserId,
        email: newUser.email,
        firstName: 'Test',
        lastName: 'User',
        type: 'human',
      },
    })

    // Add member to project in DB
    await prisma.projectMembers.create({
      data: {
        projectId: testProjectId,
        userId: newUserId,
        roleIds: [], // No roles for now
      },
    })

    const project = await prisma.project.findUniqueOrThrow({
      where: { id: testProjectId },
      select: projectSelect,
    })

    // Act
    await gitlabController.handleUpsert(project)

    // Assert
    const groupPath = `${config.projectRootPath}/${testProjectSlug}`
    const group = z.object({
      id: z.number(),
      name: z.string(),
      web_url: z.string(),
    }).parse(await gitlabService.getGroupByPath(groupPath))

    const members = await gitlabService.getGroupMembers(group)
    const isNewMemberPresent = members.some(m => m.id === newUser.id)
    expect(isNewMemberPresent).toBe(true)

    await prisma.projectMembers.deleteMany({ where: { userId: newUserId } }).catch(() => {})
    await prisma.user.delete({ where: { id: newUserId } }).catch(() => {})
  }, 72000)
})
