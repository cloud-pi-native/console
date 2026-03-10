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
import z from 'zod'

describe.skip('GitlabController (e2e)', {}, () => {
  let moduleRef: TestingModule
  let gitlabController: GitlabControllerService
  let gitlabService: GitlabService
  let gitlabClient: GitlabClientService
  let vaultService: VaultService
  let prisma: PrismaService

  let testProjectId: string
  let testProjectSlug: string
  let projectRootPath: string
  let ownerId: string
  let ownerEmail: string
  let gitlabOwnerId: number

  beforeAll(async () => {
    projectRootPath = 'forge-dso-e2e'

    vi.stubEnv('GITLAB_URL', process.env.GITLAB_URL || 'http://localhost:8080')
    vi.stubEnv('GITLAB_TOKEN', process.env.GITLAB_TOKEN || 'glpat-test-token')
    vi.stubEnv('PROJECTS_ROOT_DIR', projectRootPath)
    vi.stubEnv('DB_URL', process.env.DB_URL || 'postgresql://admin:admin@localhost:5432/dso-console-db')
    vi.stubEnv('VAULT_URL', process.env.VAULT_URL || 'http://localhost:8200')
    vi.stubEnv('VAULT_TOKEN', process.env.VAULT_TOKEN || 'root')

    moduleRef = await Test.createTestingModule({
      imports: [GitlabModule, ConfigurationModule, InfrastructureModule],
    }).compile()

    await moduleRef.init()

    gitlabController = moduleRef.get<GitlabControllerService>(GitlabControllerService)
    gitlabService = moduleRef.get<GitlabService>(GitlabService)
    gitlabClient = moduleRef.get<GitlabClientService>(GitlabClientService)
    vaultService = moduleRef.get<VaultService>(VaultService)
    prisma = moduleRef.get<PrismaService>(PrismaService)

    testProjectId = faker.string.uuid()
    testProjectSlug = faker.helpers.slugify(`test-project-${faker.string.uuid()}`)
    ownerId = faker.string.uuid()
    ownerEmail = faker.internet.email({ firstName: 'test-owner', provider: 'example.com' }).toLowerCase()

    // Create owner in GitLab
    try {
      const existingUsers = await gitlabClient.Users.all({ search: ownerEmail })
      if (existingUsers.length > 0) {
        gitlabOwnerId = existingUsers[0].id
      } else {
        const user = await gitlabClient.Users.create({
          email: ownerEmail,
          username: `test-owner-${faker.string.uuid()}`, // Ensure unique username
          name: 'Test Owner',
          password: 'password123',
          skipConfirmation: true,
        })
        gitlabOwnerId = user.id
      }
    } catch (error) {
      console.error('Failed to create/find GitLab owner:', error)
      throw error
    }

    // Create owner in DB
    await prisma.user.create({
      data: {
        id: ownerId,
        email: ownerEmail,
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
        await gitlabService.deleteGroup(group.id)
      }
    }

    // Clean GitLab user (owner)
    if (gitlabOwnerId) {
      await gitlabClient.Users.remove(gitlabOwnerId)
    }

    // Clean Vault
    if (testProjectSlug && projectRootPath) {
      const vaultPath = `${projectRootPath}/${testProjectSlug}`
      await vaultService.destroy(`${vaultPath}/tech/GITLAB_MIRROR`)
    }

    // Clean DB
    if (prisma) {
      await prisma.projectMembers.deleteMany({ where: { projectId: testProjectId } }).catch(() => {})
      await prisma.project.deleteMany({ where: { id: testProjectId } }).catch(() => {})
      await prisma.user.deleteMany({ where: { id: ownerId } }).catch(() => {})
    }

    await moduleRef.close()

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
    const isMember = members.some(m => m.id === gitlabOwnerId)
    expect(isMember).toBe(true)

    // Check Vault
    // The controller writes to GITLAB_MIRROR path during reconciliation
    // But only if createProjectMirrorAccessToken is called, which happens in ensureSystemRepos -> ensureMirrorRepo
    const vaultPath = `${projectRootPath}/${testProjectSlug}/tech/GITLAB_MIRROR`
    const secret = await vaultService.read(vaultPath)
    expect(secret).toBeDefined()
    expect(secret?.data).toHaveProperty('MIRROR_USER')
    expect(secret?.data).toHaveProperty('MIRROR_TOKEN')
  })

  it('should add member to GitLab group when added in DB', async () => {
    const newUserId = faker.string.uuid()
    const newUserEmail = faker.internet.email({ firstName: 'test-user', provider: 'example.com' }).toLowerCase()

    // Create user in DB
    await prisma.user.create({
      data: {
        id: newUserId,
        email: newUserEmail,
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
    const member = members.find(m => m.username === newUserEmail.split('@')[0])
    expect(member).toBeDefined()

    // Cleanup extra user
    await gitlabClient.Users.remove(member!.id).catch(() => {})
    await prisma.projectMembers.deleteMany({ where: { userId: newUserId } }).catch(() => {})
    await prisma.user.delete({ where: { id: newUserId } }).catch(() => {})
  })
})
