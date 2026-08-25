import type { ExpandedUserSchema, Gitlab } from '@gitbeaker/core'
import type { ConfigType } from '@nestjs/config'
import type { RepositorySyncEventPayload } from '../src/modules/events/app-events.service'
import type { TestingModule } from '@nestjs/testing'
import { faker } from '@faker-js/faker'
import { ConfigModule } from '@nestjs/config'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { Test } from '@nestjs/testing'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { baseConfigFactory } from '../src/config/base.config'
import { GITLAB_REST_CLIENT, GitlabClientService } from '../src/modules/gitlab/gitlab-client.service'
import { projectSelect } from '../src/modules/gitlab/gitlab-datastore.service'
import { GitlabModule } from '../src/modules/gitlab/gitlab.module'
import { AuthModule } from '../src/modules/infrastructure/auth/auth.module'
import { DatabaseModule } from '../src/modules/infrastructure/database/database.module'
import { PrismaService } from '../src/modules/infrastructure/database/prisma.service'
import { EventsModule } from '../src/modules/infrastructure/events/events.module'
import { LoggerModule } from '../src/modules/infrastructure/logger/logger.module'
import { PermissionModule } from '../src/modules/infrastructure/permission/permission.module'
import { VaultClientService } from '../src/modules/vault/vault-client.service'
import { getFailedPlugins, mergePluginResults } from '../src/modules/plugin/plugin.utils'
import { isPluginResults } from '../src/modules/events/app-events.utils'
import { getDotenvPaths } from '../src/utils/dotenv.utils'
import { getAll } from '../src/utils/iterable.utils'
import { EXTERNAL_SYNC_TIMEOUT } from './e2e-timeout'

const canRunRepositoryE2E
  = Boolean(process.env.E2E)

const describeWithRepository = describe.runIf(canRunRepositoryE2E)

describeWithRepository('RepositoryService (e2e) — repository.sync mirror parity', () => {
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

    // Seed a repository mirroring an external URL — the legacy hook.misc.syncRepository
    // target. The GitLab reconciler turns this into an `app` repo targeted by the mirror.
    await prisma.repository.create({
      data: {
        projectId: testProjectId,
        internalRepoName: 'app',
        externalRepoUrl: 'https://example.com/example.git',
        isPrivate: false,
      },
    })

    // Provision the GitLab project group + mirror repos before exercising the sync.
    const project = await prisma.project.findUniqueOrThrow({
      where: { id: testProjectId },
      select: projectSelect,
    })
    await eventEmitter.emitAsync('project.upsert', project)
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

  it('should trigger the GitLab mirror pipeline on repository.sync (legacy hook.misc.syncRepository parity)', async () => {
    const payload: RepositorySyncEventPayload = {
      projectId: testProjectId,
      projectSlug: testProjectSlug,
      internalRepoName: 'app',
      syncAllBranches: true,
    }

    const allRepos = await getAll(gitlabClientService.getRepos(testProjectSlug))
    const mirror = allRepos.find(repo => repo.name === 'mirror')
    if (!mirror) throw new Error('mirror repo not found')

    // Baseline: the reconciliation path does not itself trigger a mirror pipeline.
    const pipelinesBefore = await gitlabClient.Pipelines.all(mirror.id)

    // Act: emit the repository.sync event — the server-nestjs folding of the legacy
    // hook.misc.syncRepository contract, consumed by GitlabService.handleRepositorySync.
    const responses = await eventEmitter.emitAsync('repository.sync', payload)

    // Assert the GitLab consumer ran the mirror sync without reporting a failure.
    const merged = mergePluginResults((responses as unknown[]).filter(isPluginResults))
    expect(getFailedPlugins(merged)).toHaveLength(0)

    // Assert the mirror pipeline was actually provisioned in GitLab by the consumer.
    const pipelinesAfter = await gitlabClient.Pipelines.all(mirror.id)
    expect(pipelinesAfter.length).toBeGreaterThan(pipelinesBefore.length)
  }, EXTERNAL_SYNC_TIMEOUT)
})
