import type { TestingModule } from '@nestjs/testing'
import { faker } from '@faker-js/faker'
import { Test } from '@nestjs/testing'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { ConfigurationModule } from '../src/cpin-module/infrastructure/configuration/configuration.module'
import { ConfigurationService } from '../src/cpin-module/infrastructure/configuration/configuration.service'
import { PrismaService } from '../src/cpin-module/infrastructure/database/prisma.service'
import { InfrastructureModule } from '../src/cpin-module/infrastructure/infrastructure.module'
import { NexusClientService } from '../src/modules/nexus/nexus-client.service'
import { NexusControllerService } from '../src/modules/nexus/nexus-controller.service'
import { projectSelect } from '../src/modules/nexus/nexus-datastore.service'
import { NEXUS_PLUGIN_NAME } from '../src/modules/nexus/nexus.constants'
import { NexusModule } from '../src/modules/nexus/nexus.module'
import { NexusService } from '../src/modules/nexus/nexus.service'
import { getProjectVaultPath } from '../src/modules/nexus/nexus.utils'
import { VaultModule } from '../src/modules/vault/vault.module'
import { VaultService } from '../src/modules/vault/vault.service'

const canRunNexusE2E
  = Boolean(process.env.E2E)
    && Boolean(process.env.NEXUS_URL)
    && Boolean(process.env.NEXUS_ADMIN)
    && Boolean(process.env.NEXUS_ADMIN_PASSWORD)
    && Boolean(process.env.VAULT_URL)
    && Boolean(process.env.VAULT_TOKEN)
    && Boolean(process.env.DB_URL)

const describeWithNexus = describe.runIf(canRunNexusE2E)

describeWithNexus('NexusController (e2e)', () => {
  let moduleRef: TestingModule
  let nexusController: NexusControllerService
  let nexusClient: NexusClientService
  let nexusService: NexusService
  let vaultService: VaultService
  let config: ConfigurationService
  let prisma: PrismaService

  let ownerId: string
  let testProjectId: string
  let testProjectSlug: string

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [NexusModule, VaultModule, ConfigurationModule, InfrastructureModule],
    }).compile()

    await moduleRef.init()

    nexusController = moduleRef.get<NexusControllerService>(NexusControllerService)
    nexusClient = moduleRef.get<NexusClientService>(NexusClientService)
    nexusService = moduleRef.get<NexusService>(NexusService)
    vaultService = moduleRef.get<VaultService>(VaultService)
    config = moduleRef.get<ConfigurationService>(ConfigurationService)
    prisma = moduleRef.get<PrismaService>(PrismaService)

    ownerId = faker.string.uuid()
    testProjectId = faker.string.uuid()
    testProjectSlug = faker.helpers.slugify(`test-project-${faker.string.uuid()}`)

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
    if (testProjectSlug) {
      await nexusService.deleteProject(testProjectSlug).catch(() => {})
    }

    if (prisma) {
      await prisma.project.deleteMany({ where: { id: testProjectId } }).catch(() => {})
      await prisma.user.deleteMany({ where: { id: ownerId } }).catch(() => {})
    }

    await moduleRef.close()

    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  it('should reconcile project in Nexus (repos, role, user, vault secret)', async () => {
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
        plugins: {
          create: [
            { pluginName: NEXUS_PLUGIN_NAME, key: 'activateMavenRepo', value: 'enabled' },
            { pluginName: NEXUS_PLUGIN_NAME, key: 'activateNpmRepo', value: 'enabled' },
          ],
        },
      },
    })

    const project = await prisma.project.findUniqueOrThrow({
      where: { id: testProjectId },
      select: projectSelect,
    })

    await nexusController.handleUpsert(project)

    const mavenReleaseRepo = `${testProjectSlug}-repository-release`
    const mavenSnapshotRepo = `${testProjectSlug}-repository-snapshot`
    const mavenGroupRepo = `${testProjectSlug}-repository-group`

    const npmHostedRepo = `${testProjectSlug}-npm`
    const npmGroupRepo = `${testProjectSlug}-npm-group`

    const [releaseRepo, snapshotRepo, groupRepo, npmRepo, npmGroup] = await Promise.all([
      nexusClient.getRepositoriesMavenHosted(mavenReleaseRepo),
      nexusClient.getRepositoriesMavenHosted(mavenSnapshotRepo),
      nexusClient.getRepositoriesMavenGroup(mavenGroupRepo),
      nexusClient.getRepositoriesNpmHosted(npmHostedRepo),
      nexusClient.getRepositoriesNpmGroup(npmGroupRepo),
    ])

    expect(releaseRepo).toBeTruthy()
    expect(snapshotRepo).toBeTruthy()
    expect(groupRepo).toBeTruthy()
    expect(npmRepo).toBeTruthy()
    expect(npmGroup).toBeTruthy()

    const roleId = `${testProjectSlug}-ID`
    const role = await nexusClient.getSecurityRoles(roleId)
    expect(role).toBeTruthy()

    const users = await nexusClient.getSecurityUsers(testProjectSlug)
    expect(users.some(u => u.userId === testProjectSlug)).toBe(true)

    const vaultPath = getProjectVaultPath(config.projectRootPath, testProjectSlug, 'tech/NEXUS')
    const secret = await vaultService.read(vaultPath)
    expect(secret.data?.NEXUS_USERNAME).toBe(testProjectSlug)
    expect(secret.data?.NEXUS_PASSWORD).toBeTruthy()
  })
})
