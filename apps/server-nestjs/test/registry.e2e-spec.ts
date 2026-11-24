import type { ConfigType } from '@nestjs/config'
import type { TestingModule } from '@nestjs/testing'
import { ENABLED } from '@cpn-console/shared'
import { faker } from '@faker-js/faker'
import { ConfigModule } from '@nestjs/config'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { Test } from '@nestjs/testing'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { baseConfigFactory } from '../src/config/base.config'
import { harborConfigFactory } from '../src/config/harbor.config'
import { PrismaService } from '../src/modules/infrastructure/database/prisma.service'
import { EventsModule } from '../src/modules/infrastructure/events/events.module'
import { RegistryClientService, roAccess } from '../src/modules/integrations/registry/registry-client.service'
import { makeProjectWithDetails } from '../src/modules/integrations/registry/registry-testing.utils'
import { PLUGIN_NAME, REGISTRY_CONFIG_KEY_PUBLISH_PROJECT_ROBOT, ROBOT_NAME_PROJECT, ROBOT_NAME_RO, ROBOT_NAME_RW } from '../src/modules/integrations/registry/registry.constants'
import { RegistryModule } from '../src/modules/integrations/registry/registry.module'
import { RegistryService } from '../src/modules/integrations/registry/registry.service'
import { getHostFromUrl, getProjectVaultPath } from '../src/modules/integrations/registry/registry.utils'
import { VaultClientService } from '../src/modules/integrations/vault/vault-client.service'
import { getDotenvPaths } from '../src/utils/dotenv.utils'
import { getAll } from '../src/utils/iterable.utils'

const canRunRegistryE2E
  = Boolean(process.env.E2E)

const describeWithRegistry = describe.runIf(canRunRegistryE2E)

describeWithRegistry('RegistryService (e2e)', () => {
  let moduleRef: TestingModule
  let eventEmitter: EventEmitter2
  let registry: RegistryService
  let client: RegistryClientService
  let vault: VaultClientService
  let config: ConfigType<typeof baseConfigFactory>
  let harborConfig: ConfigType<typeof harborConfigFactory>
  let prisma: PrismaService
  let projectSlug: string
  let ownerId: string
  let projectId: string

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ envFilePath: getDotenvPaths(), isGlobal: true, load: [baseConfigFactory, harborConfigFactory] }), RegistryModule, EventsModule],
    })
      .compile()

    await moduleRef.init()

    registry = moduleRef.get(RegistryService)
    eventEmitter = moduleRef.get<EventEmitter2>(EventEmitter2)
    client = moduleRef.get(RegistryClientService)
    vault = moduleRef.get(VaultClientService)
    config = moduleRef.get(baseConfigFactory.KEY)
    harborConfig = moduleRef.get(harborConfigFactory.KEY)
    prisma = moduleRef.get<PrismaService>(PrismaService)

    projectSlug = faker.helpers.slugify(`test-project-${faker.string.alphanumeric({ length: 10 }).toLowerCase()}`).slice(0, 50)

    ownerId = faker.string.uuid()
    projectId = faker.string.uuid()

    await prisma.user.create({
      data: {
        id: ownerId,
        email: faker.internet.email().toLowerCase(),
        firstName: 'Test',
        lastName: 'Owner',
        type: 'human',
      },
    })

    await prisma.project.create({
      data: {
        id: projectId,
        slug: projectSlug,
        name: projectSlug,
        ownerId,
        description: 'Registry e2e Test Project',
        hprodCpu: 0,
        hprodGpu: 0,
        hprodMemory: 0,
        prodCpu: 0,
        prodGpu: 0,
        prodMemory: 0,
        plugins: {
          create: [{
            pluginName: PLUGIN_NAME,
            key: REGISTRY_CONFIG_KEY_PUBLISH_PROJECT_ROBOT,
            value: ENABLED,
          }],
        },
      },
    })
  })

  afterAll(async () => {
    if (vault && config && projectSlug) {
      const paths = [ROBOT_NAME_RO, ROBOT_NAME_RW, ROBOT_NAME_PROJECT].map(name => getProjectVaultPath(makeProjectWithDetails({ slug: projectSlug }), config.projectsRootDir, `REGISTRY/${name}`))
      await Promise.all(paths.map(path => vault.delete(path).catch(() => {})))
    }

    if (registry && projectSlug) {
      await registry.deleteProject(projectSlug).catch(() => {})
    }

    if (prisma) {
      await prisma.project.deleteMany({ where: { id: projectId } }).catch(() => {})
      await prisma.user.deleteMany({ where: { id: ownerId } }).catch(() => {})
    }

    await moduleRef?.close()
  })

  it('should provision project in Harbor and write robot secrets to Vault', async () => {
    const result = await eventEmitter.emitAsync('project.upsert', { projectId })
    expect(result[0]?.harbor?.status).toBe('OK')

    const project = await client.getProjectByName(projectSlug)
    expect(project.status).toBe(200)

    const robots = await getAll(client.getProjectRobots(Number(project.data?.project_id)))
    const robotNames = robots.flatMap(r => r.name ? [r.name] : [])
    expect(robotNames).toContain(`robot$${projectSlug}+${ROBOT_NAME_RO}`)
    expect(robotNames).toContain(`robot$${projectSlug}+${ROBOT_NAME_RW}`)
    expect(robotNames).toContain(`robot$${projectSlug}+${ROBOT_NAME_PROJECT}`)

    const vaultPaths = [ROBOT_NAME_RO, ROBOT_NAME_RW, ROBOT_NAME_PROJECT].map(name => getProjectVaultPath(makeProjectWithDetails({ slug: projectSlug }), config.projectsRootDir, `REGISTRY/${name}`))
    const [roSecret, rwSecret, projectSecret] = await Promise.all(vaultPaths.map(path => vault.read(path)))
    expect(roSecret.data?.HOST).toBe(getHostFromUrl(harborConfig.url))
    expect(rwSecret.data?.HOST).toBe(getHostFromUrl(harborConfig.url))
    expect(projectSecret.data?.HOST).toBe(getHostFromUrl(harborConfig.url))
    expect(roSecret.data?.USERNAME).toBe(`robot$${projectSlug}+${ROBOT_NAME_RO}`)
    expect(rwSecret.data?.USERNAME).toBe(`robot$${projectSlug}+${ROBOT_NAME_RW}`)
    expect(projectSecret.data?.USERNAME).toBe(`robot$${projectSlug}+${ROBOT_NAME_PROJECT}`)
  })

  it('should re-sync an existing project without trippingthe retention duplicate (400)', async () => {
    // Harbor keeps one retention policy per project: a second POST /retentions
    // would return 400. A re-sync via the upsert event must reconcile the existing
    // policy instead of creating a second one..
    const result = await eventEmitter.emitAsync('project.upsert', { projectId })
    expect(result[0]?.harbor?.status).toBe('OK')

    const project = await client.getProjectByName(projectSlug)
    expect(project.status).toBe(200)
    expect(project.data?.metadata?.retention_id).toBeTruthy()
  })

  it('should converge a drifted robot duration in place without a 400', async () => {
    const project = await client.getProjectByName(projectSlug)
    const harborProjectId = Number(project.data?.project_id)
    const robots = await getAll(client.getProjectRobots(harborProjectId))
    const roRobot = robots.find(r => r.name === `robot$${projectSlug}+${ROBOT_NAME_RO}`)
    expect(roRobot?.id).toBeDefined()

    const target = harborConfig.robotExpirationRoDays
    const driftedDuration = target > 0 ? target + 1 : 30
    const drifted = await client.updateRobot(Number(roRobot?.id), {
      name: `robot$${projectSlug}+${ROBOT_NAME_RO}`,
      duration: driftedDuration,
      description: 'robot for ci builds',
      disable: false,
      level: 'project',
      permissions: [{ namespace: projectSlug, kind: 'project', access: roAccess }],
    })
    expect(drifted.status).toBe(200)

    const vaultPath = getProjectVaultPath(makeProjectWithDetails({ slug: projectSlug }), config.projectsRootDir, `REGISTRY/${ROBOT_NAME_RO}`)
    const secretBefore = await vault.read(vaultPath)

    const result = await eventEmitter.emitAsync('project.upsert', { projectId })
    expect(result[0]?.harbor?.status).toBe('OK')

    const converged = await getAll(client.getProjectRobots(harborProjectId))
    expect(converged.find(r => r.id === roRobot?.id)?.duration).toBe(target)

    const secretAfter = await vault.read(vaultPath)
    expect(secretAfter.data?.TOKEN).toBe(secretBefore.data?.TOKEN)
  })

  it('should remove project from Harbor on delete', async () => {
    await eventEmitter.emitAsync('project.delete', { projectId })

    const project = await client.getProjectByName(projectSlug)
    expect(project.status).toBe(404)
  })
})
