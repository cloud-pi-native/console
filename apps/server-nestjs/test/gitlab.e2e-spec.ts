import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import { GitlabModule } from '@/modules/gitlab/gitlab.module'
import { GitlabControllerService } from '@/modules/gitlab/gitlab-controller.service'
import { GitlabClientService } from '@/modules/gitlab/gitlab-client.service'
import { GitlabService } from '@/modules/gitlab/gitlab.service'
import { PrismaService } from '@/cpin-module/infrastructure/database/prisma.service'
import { ConfigurationModule } from '../src/cpin-module/infrastructure/configuration/configuration.module'
import { InfrastructureModule } from '@/cpin-module/infrastructure/infrastructure.module'
import { VaultService } from '@/modules/vault/vault.service'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { faker } from '@faker-js/faker'
import { projectSelect } from '@/modules/gitlab/gitlab-datastore.service'
import { ConfigurationService } from '@/cpin-module/infrastructure/configuration/configuration.service'
import z from 'zod'
import { AdminUserSchema, ExpandedUserSchema } from '@gitbeaker/core'
import { Prisma } from '@prisma/client'

const canRunGitlabE2E
  = Boolean(process.env.GITLAB_URL)
    && Boolean(process.env.GITLAB_TOKEN)
    && Boolean(process.env.VAULT_URL)
    && Boolean(process.env.VAULT_TOKEN)
    && Boolean(process.env.DB_URL)

const describeWithGitLab = describe.runIf(canRunGitlabE2E)

describeWithGitLab('GitlabController (e2e)', {}, () => {
  let moduleRef: TestingModule
  let gitlabController: GitlabControllerService
  let gitlabService: GitlabService
  let gitlabClient: GitlabClientService
  let vaultService: VaultService
  let prisma: PrismaService
  let config: ConfigurationService

  let testProjectId: string
  let testProjectSlug: string
  let projectRootPath: string
  let ownerId: string
  let ownerUser: ExpandedUserSchema

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [GitlabModule, ConfigurationModule, InfrastructureModule],
    }).compile()

    await moduleRef.init()

    gitlabController = moduleRef.get<GitlabControllerService>(GitlabControllerService)
    gitlabService = moduleRef.get<GitlabService>(GitlabService)
    gitlabClient = moduleRef.get<GitlabClientService>(GitlabClientService)
    vaultService = moduleRef.get<VaultService>(VaultService)
    prisma = moduleRef.get<PrismaService>(PrismaService)
    config = moduleRef.get<ConfigurationService>(ConfigurationService)

    ownerId = faker.string.uuid()
    testProjectId = faker.string.uuid()
    testProjectSlug = faker.helpers.slugify(`test-project-${faker.string.uuid()}`)
    projectRootPath = config.projectRootPath ?? 'forge-dso-e2e'

    const ownerEmail = `test-owner-${ownerId}@example.com`

    // Create owner in GitLab
    ownerUser = await gitlabClient.Users.create({
      name: 'Test Owner',
      password: faker.internet.password({ length: 24 }),
      username: `test-owner-${ownerId}`,
      email: ownerEmail,
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
    if (testProjectSlug && projectRootPath) {
      const fullPath = `${projectRootPath}/${testProjectSlug}`
      const group = await gitlabService.getGroupByPath(fullPath)
      if (group) {
        await gitlabService.deleteGroup(group.id).catch(() => {})
      }
    }

    // Clean Vault
    if (testProjectSlug && projectRootPath) {
      const vaultPath = `${projectRootPath}/${testProjectSlug}`
      await vaultService.destroy(`${vaultPath}/tech/GITLAB_MIRROR`).catch(() => {})
      await vaultService.destroy(`${vaultPath}/app-mirror`).catch(() => {})
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
    const groupPath = `${projectRootPath}/${testProjectSlug}`
    const group = z.object({
      id: z.number(),
      name: z.string(),
      full_path: z.string(),
    }).parse(await gitlabService.getGroupByPath(groupPath))
    expect(group.full_path).toBe(groupPath)

    // Check membership
    const members = await gitlabService.getGroupMembers(group!.id)
    const isMember = members.some(m => m.id === ownerUser.id)
    expect(isMember).toBe(true)

    const repoVaultPath = `${projectRootPath}/${testProjectSlug}/app-mirror`
    const repoSecret = await vaultService.read(repoVaultPath)
    expect(repoSecret).not.toBeNull()
    expect(repoSecret?.data?.GIT_OUTPUT_USER).toBeTruthy()
    expect(repoSecret?.data?.GIT_OUTPUT_PASSWORD).toBeTruthy()
  }, 180000)

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
    const groupPath = `${projectRootPath}/${testProjectSlug}`
    const group = z.object({
      id: z.number(),
    }).parse(await gitlabService.getGroupByPath(groupPath))

    const members = await gitlabService.getGroupMembers(group.id)
    const member = members.find(m => m.username === newUser.username || m.email?.toLowerCase() === newUser.email.toLowerCase())
    expect(member).toBeDefined()

    await prisma.projectMembers.deleteMany({ where: { userId: newUser.id.toString() } }).catch(() => {})
    await prisma.user.delete({ where: { id: newUser.id.toString() } }).catch(() => {})
  }, 180000)
})
