import type { ExpandedUserSchema, Gitlab } from '@gitbeaker/core'
import type { ConfigType } from '@nestjs/config'
import type { TestingModule } from '@nestjs/testing'
import { faker } from '@faker-js/faker'
import { ConfigModule } from '@nestjs/config'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { Test } from '@nestjs/testing'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import z from 'zod'
import { baseConfigFactory } from '../src/config/base.config'
import { GITLAB_REST_CLIENT, GitlabClientService } from '../src/modules/gitlab/gitlab-client.service'
import { projectSelect } from '../src/modules/gitlab/gitlab-datastore.service'
import { GITLAB_CI_CONFIG_PATH, INFRA_APPS_REPO_NAME, MIRROR_REPO_NAME, TOPIC_PLUGIN_MANAGED, TOPIC_SYSTEM_MANAGED } from '../src/modules/gitlab/gitlab.constants'
import { GitlabModule } from '../src/modules/gitlab/gitlab.module'
import { AuthModule } from '../src/modules/infrastructure/auth/auth.module'
import { DatabaseModule } from '../src/modules/infrastructure/database/database.module'
import { PrismaService } from '../src/modules/infrastructure/database/prisma.service'
import { EventsModule } from '../src/modules/infrastructure/events/events.module'
import { LoggerModule } from '../src/modules/infrastructure/logger/logger.module'
import { PermissionModule } from '../src/modules/infrastructure/permission/permission.module'
import { VaultClientService } from '../src/modules/vault/vault-client.service'
import { getDotenvPaths } from '../src/utils/dotenv.utils'
import { getAll } from '../src/utils/iterable.utils'
import { GITLAB_PURGE_SYNC_TIMEOUT, GITLAB_SYNC_TIMEOUT } from './constants'

const canRunGitlabE2E
  = Boolean(process.env.E2E)

const describeWithGitLab = describe.runIf(canRunGitlabE2E)

describeWithGitLab('GitlabService (e2e)', () => {
  let moduleRef: TestingModule
  let eventEmitter: EventEmitter2
  let gitlabClientService: GitlabClientService
  let gitlabClient: Gitlab
  let vaultService: VaultClientService
  let prisma: PrismaService
  let config: ConfigType<typeof baseConfigFactory>

  let testProjectId: string
  let testProjectSlug: string
  let ownerId: string
  let ownerUser: ExpandedUserSchema

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [GitlabModule, ConfigModule.forRoot({ envFilePath: getDotenvPaths(), isGlobal: true, load: [baseConfigFactory] }), AuthModule, DatabaseModule, EventsModule, LoggerModule, PermissionModule],
    }).compile()

    await moduleRef.init()

    gitlabClientService = moduleRef.get<GitlabClientService>(GitlabClientService)
    gitlabClient = moduleRef.get<Gitlab>(GITLAB_REST_CLIENT)
    vaultService = moduleRef.get<VaultClientService>(VaultClientService)
    prisma = moduleRef.get<PrismaService>(PrismaService)
    eventEmitter = moduleRef.get<EventEmitter2>(EventEmitter2)
    config = moduleRef.get(baseConfigFactory.KEY)

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
  })

  afterAll(async () => {
    // Clean GitLab group
    if (testProjectSlug && config.projectsRootDir) {
      const fullPath = `${config.projectsRootDir}/${testProjectSlug}`
      const group = await gitlabClientService.getGroupByPath(fullPath)
      if (group) {
        await gitlabClientService.deleteGroup(group).catch(() => {})
      }
    }

    // Clean Vault
    if (testProjectSlug && config.projectsRootDir) {
      const vaultPath = `${config.projectsRootDir}/${testProjectSlug}`
      await vaultService.delete(`${vaultPath}/tech/GITLAB_MIRROR`).catch(() => {})
      await vaultService.delete(`${vaultPath}/app-mirror`).catch(() => {})
    }

    // Clean DB
    if (prisma) {
      await prisma.projectMembers.deleteMany({ where: { projectId: testProjectId } }).catch(() => {})
      await prisma.project.deleteMany({ where: { id: testProjectId } }).catch(() => {})
      await prisma.user.deleteMany({ where: { id: ownerId } }).catch(() => {})
    }

    if (ownerUser?.id) {
      await gitlabClient.Users.remove(ownerUser.id).catch(() => {})
    }

    await moduleRef?.close()

    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  it('should reconcile and create project group in GitLab and Vault secrets', async () => {
    const project = await prisma.project.findUniqueOrThrow({
      where: { id: testProjectId },
      select: projectSelect,
    })

    // Act
    await eventEmitter.emitAsync('project.upsert', project)

    // Assert
    const groupPath = `${config.projectsRootDir}/${testProjectSlug}`
    const group = z.object({
      id: z.number(),
      name: z.string(),
      full_path: z.string(),
      web_url: z.string(),
    }).parse(await gitlabClientService.getGroupByPath(groupPath))
    expect(group.full_path).toBe(groupPath)

    // Check membership
    const members = await gitlabClientService.getGroupMembers(group)
    const isMember = members.some(m => m.id === ownerUser.id)
    expect(isMember).toBe(true)

    const repoVaultPath = `${config.projectsRootDir}/${testProjectSlug}/app-mirror`
    const repoSecret = await vaultService.read(repoVaultPath)
    expect(repoSecret?.data?.GIT_OUTPUT_USER).toBeTruthy()
    expect(repoSecret?.data?.GIT_OUTPUT_PASSWORD).toBeTruthy()
  }, GITLAB_SYNC_TIMEOUT)

  it('system repos use the default CI file, user repos mirroring an external URL use the custom one', async () => {
    const project = await prisma.project.findUniqueOrThrow({
      where: { id: testProjectId },
      select: projectSelect,
    })

    await eventEmitter.emitAsync('project.upsert', project)

    const repos = await getAll(gitlabClientService.getRepos(testProjectSlug))
    const mirror = repos.find(repo => repo.name === 'mirror')
    if (!mirror) throw new Error('mirror repo not found')
    const infraApps = repos.find(repo => repo.name === 'infra-apps')
    if (!infraApps) throw new Error('infra-apps repo not found')
    const app = repos.find(repo => repo.name === 'app')
    if (!app) throw new Error('app repo not found')

    // The mirror pipeline must resolve the default .gitlab-ci.yml committed by commitMirror.
    // A custom ci_config_path would make GitLab look for .gitlab-ci-dso.yml, which is never
    // committed into the mirror repo (issue #2475: HTTP 400 on pipeline trigger).
    expect(mirror.ci_config_path).toBeFalsy()
    expect(infraApps.ci_config_path).toBeFalsy()

    // Mirroring an external URL pin the custom CI config path.
    expect(app.ci_config_path).toBe(GITLAB_CI_CONFIG_PATH)

    // commitMirror wrote the default CI file into the mirror repo
    const ciFile = await gitlabClientService.getFile(mirror, '.gitlab-ci.yml', 'main')
    expect(ciFile).toBeTruthy()
  }, GITLAB_SYNC_TIMEOUT)

  it('should trigger the mirror pipeline using the mirror repo default CI config', async () => {
    const project = await prisma.project.findUniqueOrThrow({
      where: { id: testProjectId },
      select: projectSelect,
    })
    await eventEmitter.emitAsync('project.upsert', project)

    const allRepos = await getAll(gitlabClientService.getRepos(testProjectSlug))
    const mirror = allRepos.find(repo => repo.name === 'mirror')
    if (!mirror) throw new Error('mirror repo not found')

    // The mirror pipeline includes mirror.yml ($CATALOG_PATH) from the DSO catalog
    // project forge-mi/projects/catalog. The integration GitLab sets CATALOG_PATH at
    // the instance/group level but not on the ephemeral test projects under
    // forge-dev/projects, so set it (and its project-level permission) here.
    await gitlabClient.ProjectVariables.create(mirror.id, 'CATALOG_PATH', 'forge-mi/projects/catalog', {
      variableType: 'env_var',
      masked: false,
      protected: false,
      raw: true,
    })

    const pipeline = await gitlabClientService.triggerMirror(testProjectSlug, 'app', false, 'main')
    expect(pipeline.id).toBeTruthy()
  }, GITLAB_SYNC_TIMEOUT)

  describe('project members', () => {
    let newUserId: string | undefined
    let newUserGitlabId: number | undefined

    beforeAll(async () => {
      newUserId = faker.string.uuid()
      const newUser = await gitlabClient.Users.create({
        email: faker.internet.email().toLowerCase(),
        username: faker.internet.username(),
        name: `${faker.person.firstName()} ${faker.person.lastName()}`,
        password: faker.internet.password({ length: 24 }),
        skipConfirmation: true,
      })
      newUserGitlabId = newUser.id

      await prisma.user.create({
        data: {
          id: newUserId,
          email: newUser.email,
          firstName: 'Test',
          lastName: 'User',
          type: 'human',
        },
      })

      await prisma.projectMembers.create({
        data: {
          projectId: testProjectId,
          userId: newUserId,
          roleIds: [],
        },
      })
    })

    afterAll(async () => {
      if (newUserGitlabId) {
        await gitlabClient.Users.remove(newUserGitlabId).catch(() => {})
      }
      if (prisma && newUserId) {
        await prisma.projectMembers.deleteMany({ where: { userId: newUserId } }).catch(() => {})
        await prisma.user.deleteMany({ where: { id: newUserId } }).catch(() => {})
      }
    })

    it('should add member to GitLab group when added in DB', async () => {
      const project = await prisma.project.findUniqueOrThrow({
        where: { id: testProjectId },
        select: projectSelect,
      })

      await eventEmitter.emitAsync('project.upsert', project)

      const groupPath = `${config.projectsRootDir}/${testProjectSlug}`
      const group = z.object({
        id: z.number(),
        name: z.string(),
        web_url: z.string(),
      }).parse(await gitlabClientService.getGroupByPath(groupPath))

      const members = await gitlabClientService.getGroupMembers(group)
      const isNewMemberPresent = members.some(m => m.id === newUserGitlabId)
      expect(isNewMemberPresent).toBe(true)
    }, GITLAB_SYNC_TIMEOUT)
  })

  describe('system repo purge protection', () => {
    it('system repos (mirror, infra-apps) survive a reprovisioning that purges an orphan', async () => {
      const project = await prisma.project.findUniqueOrThrow({
        where: { id: testProjectId },
        select: projectSelect,
      })
      await eventEmitter.emitAsync('project.upsert', project)

      const groupPath = `${config.projectsRootDir}/${testProjectSlug}`
      const group = z.object({ id: z.number() }).parse(await gitlabClientService.getGroupByPath(groupPath))
      const reposBefore = await getAll(gitlabClientService.getRepos(testProjectSlug))
      const mirror = reposBefore.find(repo => repo.name === MIRROR_REPO_NAME)
      const infraApps = reposBefore.find(repo => repo.name === INFRA_APPS_REPO_NAME)
      if (!mirror) throw new Error('mirror repo not found')
      if (!infraApps) throw new Error('infra-apps repo not found')

      // System repos must carry the protection topic
      expect(mirror.topics).toContain(TOPIC_SYSTEM_MANAGED)
      expect(infraApps.topics).toContain(TOPIC_SYSTEM_MANAGED)

      // Create an orphan plugin-managed repo directly in GitLab (simulates a repo the
      // console no longer tracks: DB row removed, GitLab project left behind)
      const orphanName = `orphan-${faker.string.uuid().slice(0, 8)}`
      const orphan = await gitlabClient.Projects.create({
        name: orphanName,
        path: orphanName,
        namespaceId: group.id,
      })
      await gitlabClient.Projects.edit(orphan.id, { topics: [TOPIC_PLUGIN_MANAGED] })

      // Second reconciliation: the orphan must be purged, system repos must survive
      const project2 = await prisma.project.findUniqueOrThrow({
        where: { id: testProjectId },
        select: projectSelect,
      })
      await eventEmitter.emitAsync('project.upsert', project2)

      const reposAfter = await getAll(gitlabClientService.getRepos(testProjectSlug))
      const namesAfter = reposAfter.map(repo => repo.name)

      expect(namesAfter).not.toContain(orphanName)
      expect(namesAfter).toContain(MIRROR_REPO_NAME)
      expect(namesAfter).toContain(INFRA_APPS_REPO_NAME)
      expect(namesAfter).toContain('app')
    }, GITLAB_PURGE_SYNC_TIMEOUT)

    it('declared user repos are never purged even without the system-managed topic', async () => {
      const project = await prisma.project.findUniqueOrThrow({
        where: { id: testProjectId },
        select: projectSelect,
      })
      await eventEmitter.emitAsync('project.upsert', project)

      const repos = await getAll(gitlabClientService.getRepos(testProjectSlug))
      const app = repos.find(repo => repo.name === 'app')
      if (!app) throw new Error('app repo not found')

      // The declared user repo carries plugin-managed but NOT system-managed; the
      // declared-in-project guard must keep it alive across reconciliations.
      expect(app.topics).toContain(TOPIC_PLUGIN_MANAGED)
      expect(app.topics).not.toContain(TOPIC_SYSTEM_MANAGED)

      const project2 = await prisma.project.findUniqueOrThrow({
        where: { id: testProjectId },
        select: projectSelect,
      })
      await eventEmitter.emitAsync('project.upsert', project2)

      const reposAfter = await getAll(gitlabClientService.getRepos(testProjectSlug))
      expect(reposAfter.some(repo => repo.name === 'app')).toBe(true)
    }, GITLAB_PURGE_SYNC_TIMEOUT)

    it('purge does not fail when a repo is already marked for deletion', async () => {
      // Create a NEW orphan repo in GitLab, then delete it directly (async). The
      // subsequent reconcile's purge observes it as still present and DELETEs again
      // → GitLab answers 400 "Already Marked for Deletion" which must be swallowed
      // so the whole reconciliation succeeds and the system repos survive.
      const groupPath = `${config.projectsRootDir}/${testProjectSlug}`
      const group = z.object({ id: z.number() }).parse(await gitlabClientService.getGroupByPath(groupPath))
      const orphanName = `orphan-race-${faker.string.uuid().slice(0, 8)}`
      const orphan = await gitlabClient.Projects.create({
        name: orphanName,
        path: orphanName,
        namespaceId: group.id,
      })
      await gitlabClient.Projects.edit(orphan.id, { topics: [TOPIC_PLUGIN_MANAGED] })

      // Simulate the async-deletion race: DELETE the orphan directly (not through
      // the reconcile) so it is marked for deletion, then reconcile immediately.
      await gitlabClientService.deleteProjectGroupRepo(testProjectSlug, orphanName).catch(() => {})

      const project = await prisma.project.findUniqueOrThrow({
        where: { id: testProjectId },
        select: projectSelect,
      })
      await expect(eventEmitter.emitAsync('project.upsert', project)).resolves.not.toThrow()

      const namesAfter = (await getAll(gitlabClientService.getRepos(testProjectSlug))).map(repo => repo.name)
      expect(namesAfter).toContain(MIRROR_REPO_NAME)
      expect(namesAfter).toContain(INFRA_APPS_REPO_NAME)
      expect(namesAfter).toContain('app')
    }, GITLAB_PURGE_SYNC_TIMEOUT)
  })

  describe('repo deletion', () => {
    it('deleteProjectGroupRepo permanently removes the repo immediately', async () => {
      // Create a plugin-managed repo, then delete it through the service.
      // With permanentlyRemove the project must be gone right away: still
      // present-but-marked would mean the hard delete was skipped.
      const project = await prisma.project.findUniqueOrThrow({
        where: { id: testProjectId },
        select: projectSelect,
      })
      await eventEmitter.emitAsync('project.upsert', project)

      const groupPath = `${config.projectsRootDir}/${testProjectSlug}`
      const group = z.object({ id: z.number() }).parse(await gitlabClientService.getGroupByPath(groupPath))
      const repoName = `to-delete-${faker.string.uuid().slice(0, 8)}`
      const repo = await gitlabClient.Projects.create({
        name: repoName,
        path: repoName,
        namespaceId: group.id,
      })
      await gitlabClient.Projects.edit(repo.id, { topics: [TOPIC_PLUGIN_MANAGED] })

      await gitlabClientService.deleteProjectGroupRepo(testProjectSlug, repoName)

      await expect(gitlabClient.Projects.show(repo.id)).rejects.toThrow()
      const names = (await getAll(gitlabClientService.getRepos(testProjectSlug))).map(r => r.name)
      expect(names).not.toContain(repoName)
    }, GITLAB_SYNC_TIMEOUT)
  })

  it('should remove project group from GitLab on delete', async () => {
    const project = await prisma.project.findUniqueOrThrow({
      where: { id: testProjectId },
      select: projectSelect,
    })

    const groupPath = `${config.projectsRootDir}/${testProjectSlug}`
    expect(await gitlabClientService.getGroupByPath(groupPath)).toBeTruthy()

    await eventEmitter.emitAsync('project.delete', project)

    const group = await gitlabClientService.getGroupByPath(groupPath)
    expect(group).toBeUndefined()
  }, GITLAB_SYNC_TIMEOUT)
})
