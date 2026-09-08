import type KcAdminClient from '@keycloak/keycloak-admin-client'
import type { TestingModule } from '@nestjs/testing'
import { DISABLED, PROJECT_PERMS } from '@cpn-console/shared'
import { faker } from '@faker-js/faker'
import { Logger } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { Test } from '@nestjs/testing'
import { afterAll, beforeAll, expect, it, vi } from 'vitest'
import z from 'zod'
import { baseConfigFactory } from '../src/config/base.config'
import { GitlabClientService } from '../src/modules/gitlab/gitlab-client.service'
import { AuthModule } from '../src/modules/infrastructure/auth/auth.module'
import { DatabaseModule } from '../src/modules/infrastructure/database/database.module'
import { PrismaService } from '../src/modules/infrastructure/database/prisma.service'
import { EventsModule } from '../src/modules/infrastructure/events/events.module'
import { LoggerModule } from '../src/modules/infrastructure/logger/logger.module'
import { PermissionModule } from '../src/modules/infrastructure/permission/permission.module'
import { KEYCLOAK_ADMIN_CLIENT, KeycloakClientService } from '../src/modules/keycloak/keycloak-client.service'
import { ObservabilityClientService } from '../src/modules/observability/observability-client.service'
import { projectSelect } from '../src/modules/observability/observability-datastore.service'
import {
  GRAFANA_GROUP_NAME,
  GRAFANA_SUBGROUP_HPROD_RO,
  GRAFANA_SUBGROUP_HPROD_RW,
  GRAFANA_SUBGROUP_PROD_RO,
  GRAFANA_SUBGROUP_PROD_RW,
} from '../src/modules/observability/observability.constants'
import { ObservabilityModule } from '../src/modules/observability/observability.module'
import { getDotenvPaths } from '../src/utils/dotenv.utils'
import { KEYCLOAK_GROUP_SYNC_TIMEOUT } from './constants'

import { ALL_GRAFANA_SUBGROUPS, describeWithObservability } from './observability.utils'

describeWithObservability('ObservabilityService (e2e)', () => {
  let moduleRef: TestingModule
  let eventEmitter: EventEmitter2
  let keycloak: KeycloakClientService
  let keycloakAdminClient: KcAdminClient
  let prisma: PrismaService

  let ownerId: string
  let memberRoId: string
  let memberRwId: string
  let roleRoId: string
  let roleRwId: string
  let testProjectId: string
  let testProjectSlug: string
  let envProdId: string
  let zoneId: string
  let kubeconfigId: string
  let clusterId: string

  function grafanaSubgroupPath(subgroupName: string): string {
    return `/${testProjectSlug}/${GRAFANA_GROUP_NAME}/${subgroupName}`
  }

  async function subgroupMembers(subgroupName: string): Promise<string[]> {
    const subgroup = z.object({
      id: z.string(),
    }).parse(await keycloak.getGroupByPath(grafanaSubgroupPath(subgroupName)))
    const members = await keycloak.getGroupMembers(subgroup.id)
    return members.map(member => member.id).filter((id): id is string => Boolean(id)).sort((a, b) => a.localeCompare(b))
  }

  beforeAll(async () => {
    // GitLab (chart/values plumbing) is overridden: the dev compose ships no GitLab
    // service, and the dual-bucket regression under test lives entirely in the
    // Keycloak group sync. Keycloak and Postgres stay real.
    const gitlabStub = {
      upsertProjectGroupSystemRepo: vi.fn(async (slug: string) => ({ id: 42, path: slug })),
      generateCreateOrUpdateAction: vi.fn(async () => null),
      maybeCreateCommit: vi.fn(async () => undefined),
      getOrCreateProjectGroupPublicUrl: vi.fn(async () => 'https://gitlab.example.com'),
      getOrCreateProjectSubGroup: vi.fn(async (path: string) => ({ id: 43, path })),
      getGroupByPath: vi.fn(async (path: string) => ({ id: 44, path })),
      getOrCreateInfraGroupRepo: vi.fn(async (slug: string) => ({ id: 45, path: slug })),
    }

    moduleRef = await Test.createTestingModule({
      imports: [ObservabilityModule, ConfigModule.forRoot({ envFilePath: getDotenvPaths(), isGlobal: true, load: [baseConfigFactory] }), AuthModule, DatabaseModule, EventsModule, LoggerModule, PermissionModule],
    })
      .overrideProvider(GitlabClientService)
      .useValue(gitlabStub)
      .overrideProvider(ObservabilityClientService)
      .useValue({
        getOrCreateValuesRepo: vi.fn(async () => ({ id: 1 })),
        updateProjectConfig: vi.fn(async () => 'updated'),
        deleteProjectConfig: vi.fn(async () => undefined),
      })
      .compile()

    await moduleRef.init()

    keycloak = moduleRef.get(KeycloakClientService)
    keycloakAdminClient = moduleRef.get(KEYCLOAK_ADMIN_CLIENT)
    prisma = moduleRef.get(PrismaService)
    eventEmitter = moduleRef.get(EventEmitter2)

    memberRoId = faker.string.uuid()
    memberRwId = faker.string.uuid()
    roleRoId = faker.string.uuid()
    roleRwId = faker.string.uuid()
    testProjectId = faker.string.uuid()
    testProjectSlug = faker.helpers.slugify(`test-project-${faker.string.uuid()}`)
    envProdId = faker.string.uuid()

    // The Keycloak plugin (real, via KeycloakModule) creates the project root
    // group on the first upsert; seed it here so the sync under test never
    // races its creation order.
    await keycloakAdminClient.groups.create({ name: testProjectSlug })

    const ownerEmail = faker.internet.email({ firstName: 'test-owner', provider: 'example.com' })

    // Create users in Keycloak (they must exist in the realm to receive grafana/* memberships)
    const owner = await keycloakAdminClient.users.create({
      id: ownerId,
      username: `test-owner-${ownerId}`,
      email: ownerEmail,
      enabled: true,
      firstName: 'Test',
      lastName: 'Owner',
    })
    ownerId = owner.id ?? ownerId

    const roUser = await keycloakAdminClient.users.create({
      username: `test-user-ro-${memberRoId}`,
      email: faker.internet.email({ firstName: 'test-ro', provider: 'example.com' }),
      enabled: true,
      firstName: 'Test',
      lastName: 'ReadOnly',
    })
    memberRoId = roUser.id

    const rwUser = await keycloakAdminClient.users.create({
      username: `test-user-rw-${memberRwId}`,
      email: faker.internet.email({ firstName: 'test-rw', provider: 'example.com' }),
      enabled: true,
      firstName: 'Test',
      lastName: 'ReadWrite',
    })
    memberRwId = rwUser.id

    // Create users in DB
    await prisma.user.create({
      data: {
        id: ownerId,
        email: ownerEmail,
        firstName: 'Test',
        lastName: 'Owner',
        type: 'human',
      },
    })
    await prisma.user.create({
      data: {
        id: memberRoId,
        email: faker.internet.email({ firstName: 'test-ro', provider: 'example.com' }),
        firstName: 'Test',
        lastName: 'ReadOnly',
        type: 'human',
      },
    })
    await prisma.user.create({
      data: {
        id: memberRwId,
        email: faker.internet.email({ firstName: 'test-rw', provider: 'example.com' }),
        firstName: 'Test',
        lastName: 'ReadWrite',
        type: 'human',
      },
    })

    // Shared stages are seeded by migrations (dev, staging, integration, prod);
    // hors-prod is any stage not named prod.
    const prodStage = await prisma.stage.findUniqueOrThrow({ where: { name: 'prod' } })
    const devStage = await prisma.stage.findUniqueOrThrow({ where: { name: 'dev' } })

    zoneId = faker.string.uuid()
    kubeconfigId = faker.string.uuid()
    clusterId = faker.string.uuid()
    const zoneSlug = faker.string.alphanumeric({ length: 10 }).toLowerCase()

    await prisma.zone.create({
      data: {
        id: zoneId,
        slug: zoneSlug,
        label: `Zone ${zoneSlug}`,
        argocdUrl: 'https://example.com',
      },
    })

    await prisma.kubeconfig.create({
      data: {
        id: kubeconfigId,
        user: { token: faker.string.alphanumeric({ length: 16 }) },
        cluster: { server: 'https://example.com' },
      },
    })

    const cluster = await prisma.cluster.create({
      data: {
        id: clusterId,
        label: faker.helpers.slugify(`cluster-${faker.string.uuid()}`.slice(0, 40)),
        secretName: faker.string.uuid(),
        kubeConfigId: kubeconfigId,
        infos: null,
        memory: 100,
        cpu: 100,
        gpu: 0,
        zoneId,
      },
    })

    envProdId = faker.string.uuid()

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
        roles: {
          create: [
            {
              id: roleRoId,
              name: faker.helpers.slugify(`test-role-ro-${faker.string.uuid()}`),
              oidcGroup: `/${testProjectSlug}/role-ro`,
              permissions: BigInt(PROJECT_PERMS.LIST_ENVIRONMENTS),
              position: 0,
            },
            {
              id: roleRwId,
              name: faker.helpers.slugify(`test-role-rw-${faker.string.uuid()}`),
              oidcGroup: `/${testProjectSlug}/role-rw`,
              permissions: BigInt(PROJECT_PERMS.MANAGE_ENVIRONMENTS),
              position: 1,
            },
          ],
        },
        members: {
          create: [
            { userId: memberRoId, roleIds: [roleRoId] },
            { userId: memberRwId, roleIds: [roleRwId] },
          ],
        },
        environments: {
          create: [
            {
              id: envProdId,
              name: 'prod',
              stageId: prodStage.id,
              clusterId: cluster.id,
              cpu: 1,
              gpu: 0,
              memory: 1,
            },
            {
              name: 'dev',
              stageId: devStage.id,
              clusterId: cluster.id,
              cpu: 1,
              gpu: 0,
              memory: 1,
            },
          ],
        },
        plugins: {
          create: {
            pluginName: 'observability',
            key: 'enabled',
            value: 'true',
          },
        },
      },
    })
  })

  afterAll(async () => {
    try {
      // Clean Keycloak
      const projectGroup = await keycloak.getGroupByPath(`/${testProjectSlug}`)
      if (projectGroup?.id) {
        await keycloak.deleteGroup(projectGroup.id)
      }

      for (const userId of [ownerId, memberRoId, memberRwId]) {
        await keycloakAdminClient.users.del({ id: userId }).catch(() => {})
      }

      // Clean DB. Every delete is guarded by its concrete id: an unassigned
      // id here means beforeAll failed mid-seed, and Prisma treats
      // `undefined` in a unique filter as "match all rows".
      if (prisma) {
        if (testProjectId) {
          // ProjectRole and Repository rows carry non-cascading FKs to Project:
          // delete them explicitly or the project delete fails silently.
          await prisma.projectMembers.deleteMany({ where: { projectId: testProjectId } }).catch(() => {})
          await prisma.projectPlugin.deleteMany({ where: { projectId: testProjectId } }).catch(() => {})
          await prisma.projectRole.deleteMany({ where: { projectId: testProjectId } }).catch(() => {})
          await prisma.repository.deleteMany({ where: { projectId: testProjectId } }).catch(() => {})
          await prisma.project.deleteMany({ where: { id: testProjectId } }).catch(() => {})
        }
        if (clusterId) {
          await prisma.cluster.deleteMany({ where: { id: clusterId } }).catch(() => {})
        }
        if (kubeconfigId) {
          await prisma.kubeconfig.deleteMany({ where: { id: kubeconfigId } }).catch(() => {})
        }
        if (zoneId) {
          await prisma.zone.deleteMany({ where: { id: zoneId } }).catch(() => {})
        }
        const userIds = [ownerId, memberRoId, memberRwId].filter((id): id is string => Boolean(id))
        if (userIds.length > 0) {
          await prisma.user.deleteMany({ where: { id: { in: userIds } } }).catch(() => {})
        }
      }
    } catch (e: any) {
      Logger.warn(`Cleanup failed: ${e.message}`)
    }

    await moduleRef?.close()

    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  it('should create grafana groups and populate both stage buckets on project.upsert', async () => {
    const project = await prisma.project.findUniqueOrThrow({
      where: { id: testProjectId },
      select: projectSelect,
    })

    await eventEmitter.emitAsync('project.upsert', project)

    const expectedEdit = [ownerId, memberRwId].sort((a, b) => a.localeCompare(b))
    const expectedView = [ownerId, memberRoId, memberRwId].sort((a, b) => a.localeCompare(b))

    for (const subgroupName of ALL_GRAFANA_SUBGROUPS) {
      const subgroup = z.object({
        name: z.string(),
      }).parse(await keycloak.getGroupByPath(grafanaSubgroupPath(subgroupName)))
      expect(subgroup.name).toBe(subgroupName)
    }

    expect(await subgroupMembers(GRAFANA_SUBGROUP_PROD_RW)).toEqual(expectedEdit)
    expect(await subgroupMembers(GRAFANA_SUBGROUP_PROD_RO)).toEqual(expectedView)
    expect(await subgroupMembers(GRAFANA_SUBGROUP_HPROD_RW)).toEqual(expectedEdit)
    expect(await subgroupMembers(GRAFANA_SUBGROUP_HPROD_RO)).toEqual(expectedView)
  }, KEYCLOAK_GROUP_SYNC_TIMEOUT)

  it('should keep hors-prod memberships when the prod environment is removed', async () => {
    // Regression: the first server-nestjs sync wiped the opposite stage pair
    await prisma.environment.deleteMany({ where: { id: envProdId } })

    const project = await prisma.project.findUniqueOrThrow({
      where: { id: testProjectId },
      select: projectSelect,
    })
    await eventEmitter.emitAsync('project.upsert', project)

    const expectedEdit = [ownerId, memberRwId].sort((a, b) => a.localeCompare(b))
    const expectedView = [ownerId, memberRoId, memberRwId].sort((a, b) => a.localeCompare(b))

    expect(await subgroupMembers(GRAFANA_SUBGROUP_HPROD_RW)).toEqual(expectedEdit)
    expect(await subgroupMembers(GRAFANA_SUBGROUP_HPROD_RO)).toEqual(expectedView)

    // prod buckets converge to empty: no prod environment remains
    expect(await subgroupMembers(GRAFANA_SUBGROUP_PROD_RW)).toEqual([])
    expect(await subgroupMembers(GRAFANA_SUBGROUP_PROD_RO)).toEqual([])
  }, KEYCLOAK_GROUP_SYNC_TIMEOUT)

  it('should remove member from all grafana groups when removed from the project', async () => {
    await prisma.projectMembers.deleteMany({ where: { projectId: testProjectId, userId: memberRwId } })

    const project = await prisma.project.findUniqueOrThrow({
      where: { id: testProjectId },
      select: projectSelect,
    })
    await eventEmitter.emitAsync('project.upsert', project)

    // Post-removal edit roster is the owner alone; view keeps the RO member
    const expectedEdit = [ownerId].sort((a, b) => a.localeCompare(b))
    const expectedView = [ownerId, memberRoId].sort((a, b) => a.localeCompare(b))

    expect(await subgroupMembers(GRAFANA_SUBGROUP_PROD_RW)).toEqual([])
    expect(await subgroupMembers(GRAFANA_SUBGROUP_PROD_RO)).toEqual([])
    expect(await subgroupMembers(GRAFANA_SUBGROUP_HPROD_RW)).toEqual(expectedEdit)
    expect(await subgroupMembers(GRAFANA_SUBGROUP_HPROD_RO)).toEqual(expectedView)
  }, KEYCLOAK_GROUP_SYNC_TIMEOUT)

  it('should not touch Keycloak groups when the plugin is disabled', async () => {
    await prisma.projectPlugin.updateMany({
      where: { projectId: testProjectId, pluginName: 'observability', key: 'enabled' },
      data: { value: DISABLED },
    })

    const project = await prisma.project.findUniqueOrThrow({
      where: { id: testProjectId },
      select: projectSelect,
    })
    await eventEmitter.emitAsync('project.upsert', project)

    // Membership state from the previous sync must be untouched
    const expectedEdit = [ownerId].sort((a, b) => a.localeCompare(b))
    const expectedView = [ownerId, memberRoId].sort((a, b) => a.localeCompare(b))
    expect(await subgroupMembers(GRAFANA_SUBGROUP_HPROD_RW)).toEqual(expectedEdit)
    expect(await subgroupMembers(GRAFANA_SUBGROUP_HPROD_RO)).toEqual(expectedView)
  }, KEYCLOAK_GROUP_SYNC_TIMEOUT)

  it('should recreate grafana groups if deleted in Keycloak', async () => {
    const grafanaGroup = z.object({
      id: z.string(),
    }).parse(await keycloak.getGroupByPath(`/${testProjectSlug}/${GRAFANA_GROUP_NAME}`))
    await keycloak.deleteGroup(grafanaGroup.id)

    await prisma.projectPlugin.updateMany({
      where: { projectId: testProjectId, pluginName: 'observability', key: 'enabled' },
      data: { value: 'true' },
    })

    const project = await prisma.project.findUniqueOrThrow({
      where: { id: testProjectId },
      select: projectSelect,
    })
    await eventEmitter.emitAsync('project.upsert', project)

    const expectedEdit = [ownerId].sort((a, b) => a.localeCompare(b))
    const expectedView = [ownerId, memberRoId].sort((a, b) => a.localeCompare(b))
    expect(await subgroupMembers(GRAFANA_SUBGROUP_HPROD_RW)).toEqual(expectedEdit)
    expect(await subgroupMembers(GRAFANA_SUBGROUP_HPROD_RO)).toEqual(expectedView)
  }, KEYCLOAK_GROUP_SYNC_TIMEOUT)

  it('should delete grafana groups on project.delete', async () => {
    const project = await prisma.project.findUniqueOrThrow({
      where: { id: testProjectId },
      select: projectSelect,
    })
    await eventEmitter.emitAsync('project.delete', project)

    for (const subgroupName of ALL_GRAFANA_SUBGROUPS) {
      expect(await keycloak.getGroupByPath(grafanaSubgroupPath(subgroupName))).toBeUndefined()
    }

    // The Keycloak plugin removes the project root group on project.delete
    expect(await keycloak.getGroupByPath(`/${testProjectSlug}`)).toBeUndefined()
  }, KEYCLOAK_GROUP_SYNC_TIMEOUT)
})
