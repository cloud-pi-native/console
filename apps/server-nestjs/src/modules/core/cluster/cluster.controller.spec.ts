import type { TestingModule } from '@nestjs/testing'
import type { FastifyRequest } from 'fastify'
import type { DeepMockProxy, MockProxy } from 'vitest-mock-extended'
import type { UserContext } from '../../infrastructure/auth/auth-user.decorator'
import { ADMIN_PERMS } from '@cpn-console/shared'
import { faker } from '@faker-js/faker'
import { FastifyAdapter } from '@nestjs/platform-fastify'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it } from 'vitest'
import { mock, mockDeep } from 'vitest-mock-extended'
import { AuthService } from '../../infrastructure/auth/auth.service'
import { PrismaService } from '../../infrastructure/database/prisma.service'
import { UserPermissionPolicy } from '../../infrastructure/permission/user/user-policy.service'
import { UserPermissionService } from '../../infrastructure/permission/user/user.service'
import { makeEnvironment } from '../environment/environment-testing.utils'
import { AppEventsService } from '../events/app-events.service'
import {
  makeCluster,
  makeClusterDetailsRecord,
  makeClusterEnvironmentsRecord,
  makeClusterListRecord,
  makeCreateClusterBody,
} from './cluster-testing.utils'
import { ClusterController, toClusterDetails, toClusters } from './cluster.controller'

describe('clusterController', () => {
  let module: TestingModule
  let controller: ClusterController
  let prisma: DeepMockProxy<PrismaService>
  let appEvents: DeepMockProxy<AppEventsService>
  let auth: MockProxy<AuthService>

  const userId = faker.string.uuid()
  const request = mock<FastifyRequest>({ id: faker.string.uuid() })
  const user: UserContext = { userId, userType: 'human' }

  beforeEach(async () => {
    prisma = mockDeep<PrismaService>()
    prisma.$transaction.mockImplementation(async (cb: (tx: unknown) => unknown) => cb(prisma))
    appEvents = mockDeep<AppEventsService>()
    appEvents.emitClusterEvent.mockResolvedValue({})
    auth = mock<AuthService>()

    module = await Test.createTestingModule({
      controllers: [ClusterController],
      providers: [
        { provide: PrismaService, useValue: prisma },
        { provide: AppEventsService, useValue: appEvents },
        { provide: AuthService, useValue: auth },
        UserPermissionService,
        UserPermissionPolicy,
      ],
    }).compile()

    controller = module.get<ClusterController>(ClusterController)
  })

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })

  describe.each([
    { name: 'admin', adminPermissions: ADMIN_PERMS.MANAGE },
    { name: 'power-user', adminPermissions: ADMIN_PERMS.LIST_CLUSTERS },
    { name: 'plain user', adminPermissions: 0n },
  ])('gET /api/v1/clusters as $name', ({ name: _name, adminPermissions }) => {
    const requestor: UserContext = { userId, adminPermissions, userType: 'human' }

    it('serves 200 without an admin-only 403 and passes the requestor to the userId filter', async () => {
      const clusters = [makeClusterListRecord()]
      prisma.cluster.findMany.mockResolvedValue(clusters)
      auth.authenticate.mockResolvedValue(requestor)

      const app = module.createNestApplication(new FastifyAdapter())
      await app.init()
      const response = await app.getHttpAdapter().getInstance().inject({ method: 'GET', url: '/api/v1/clusters' })
      await app.close()

      expect(response.statusCode).toBe(200)
    })
  })

  it.each<[method: 'GET' | 'PUT' | 'DELETE', url: string]>([
    ['GET', '/api/v1/clusters/not-a-uuid'],
    ['GET', '/api/v1/clusters/usage/not-a-uuid'],
    ['GET', '/api/v1/clusters/not-a-uuid/environments'],
    ['PUT', '/api/v1/clusters/not-a-uuid'],
    ['DELETE', '/api/v1/clusters/not-a-uuid'],
  ])('rejects a malformed clusterId on %s %s with 400', async (method, url) => {
    const requestor: UserContext = { userId, adminPermissions: ADMIN_PERMS.MANAGE, userType: 'human' }
    auth.authenticate.mockResolvedValue(requestor)

    const app = module.createNestApplication(new FastifyAdapter())
    await app.init()
    const response = await app.getHttpAdapter().getInstance().inject({
      method,
      url,
      payload: method === 'PUT' ? {} : undefined,
    })
    await app.close()

    expect(response.statusCode).toBe(400)
  })

  it('maps raw list records to the contract shape', async () => {
    const record = makeClusterListRecord({ infos: null })
    prisma.cluster.findMany.mockResolvedValue([record])

    const result = await controller.list({ userId: faker.string.uuid(), adminPermissions: ADMIN_PERMS.LIST_CLUSTERS, userType: 'human' })

    expect(result).toEqual([toClusters([record])[0]])
    expect(result[0].infos).toBe('')
    expect(result[0].stageIds).toEqual([record.stages[0].id])
  })

  it('maps cluster details to the contract shape', async () => {
    const record = makeClusterDetailsRecord({ infos: null })
    prisma.cluster.findUniqueOrThrow.mockResolvedValue(record)

    const result = await controller.getDetails(record.id)

    expect(result).toEqual(expect.objectContaining({
      id: record.id,
      infos: '',
      projectIds: [record.projects[0].id],
      stageIds: [record.stages[0].id],
      kubeconfig: { cluster: record.kubeconfig.cluster, user: record.kubeconfig.user },
    }))
  })

  it('maps cluster environments for the contract response', async () => {
    const envs = [makeClusterEnvironmentsRecord(), makeClusterEnvironmentsRecord()]
    prisma.environment.findMany.mockResolvedValue(envs)

    const result = await controller.getEnvironments(faker.string.uuid())

    expect(result).toEqual(envs.map(env => ({
      project: env.project.name,
      name: env.name,
      owner: env.project.owner.email,
      cpu: env.cpu,
      gpu: env.gpu,
      memory: env.memory,
    })))
  })

  it('delegates details, usage and environments with clusterId', async () => {
    const clusterId = faker.string.uuid()
    const record = makeClusterDetailsRecord()
    const usage = { cpu: 1, gpu: 0, memory: 8 }
    prisma.cluster.findUniqueOrThrow.mockResolvedValue(record)
    prisma.environment.aggregate.mockResolvedValue({ _sum: usage, _count: { _all: 1 }, _avg: { cpu: null, gpu: null, memory: null }, _min: { cpu: null, gpu: null, memory: null }, _max: { cpu: null, gpu: null, memory: null } })
    prisma.environment.findMany.mockResolvedValue([])

    expect(await controller.getDetails(clusterId)).toEqual(toClusterDetails(record))
    expect(await controller.getUsage(clusterId)).toEqual(usage)
    await controller.getEnvironments(clusterId)
  })

  it('serves the contract URL GET /api/v1/clusters/usage/:clusterId', async () => {
    const clusterId = faker.string.uuid()
    prisma.environment.aggregate.mockResolvedValue({ _sum: { cpu: 1, gpu: 0, memory: 8 }, _count: { _all: 1 }, _avg: { cpu: null, gpu: null, memory: null }, _min: { cpu: null, gpu: null, memory: null }, _max: { cpu: null, gpu: null, memory: null } })
    prisma.cluster.findUniqueOrThrow.mockResolvedValue(makeClusterDetailsRecord())
    auth.authenticate.mockResolvedValue({ userId, adminPermissions: ADMIN_PERMS.LIST_CLUSTERS, userType: 'human' })

    const app = module.createNestApplication(new FastifyAdapter())
    await app.init()
    const server = app.getHttpAdapter().getInstance()

    const usageResponse = await server.inject({ method: 'GET', url: `/api/v1/clusters/usage/${clusterId}` })
    expect(usageResponse.statusCode).toBe(200)
    expect(usageResponse.json()).toEqual({ cpu: 1, gpu: 0, memory: 8 })

    const detailsResponse = await server.inject({ method: 'GET', url: `/api/v1/clusters/${clusterId}` })
    expect(detailsResponse.statusCode).toBe(200)

    await app.close()
  })

  it('delegates create with body, userId and requestId', async () => {
    const body = makeCreateClusterBody()
    const record = makeClusterDetailsRecord()
    const details = toClusterDetails(record)
    prisma.cluster.findUnique.mockResolvedValue(null)
    prisma.cluster.create.mockResolvedValue(makeCluster())
    prisma.cluster.findUniqueOrThrow.mockResolvedValue(record)

    expect(await controller.create(body, user, request)).toEqual(details)
  })

  it('delegates update with clusterId, body, userId and requestId', async () => {
    const clusterId = faker.string.uuid()
    const record = makeClusterDetailsRecord()
    const details = toClusterDetails(record)
    prisma.cluster.findUnique.mockResolvedValue(record)
    prisma.cluster.update.mockResolvedValue(record)
    prisma.cluster.findUniqueOrThrow.mockResolvedValue(record)

    expect(await controller.update(clusterId, { label: 'new-label' }, user, request)).toEqual(details)
  })

  it('delegates delete with clusterId, userId, requestId and force', async () => {
    const clusterId = faker.string.uuid()
    prisma.environment.findFirst.mockResolvedValue(null)
    prisma.cluster.delete.mockResolvedValue(makeClusterListRecord())

    expect(await controller.delete(clusterId, { force: true }, user, request)).toBeNull()
  })

  it('formats the forced-environment message for the contract response', async () => {
    prisma.environment.findFirst.mockResolvedValue(makeEnvironment())
    prisma.environment.deleteMany.mockResolvedValue({ count: 3 })
    prisma.cluster.delete.mockResolvedValue(makeClusterListRecord())

    expect(await controller.delete(faker.string.uuid(), { force: true }, user, request))
      .toBe('3 environnements supprimés de force, n\'oubliez pas de reprovisionner les projets concernés')
  })

  it.each<[query: string]>([
    [''],
    ['?force=true'],
  ])('returns the contract status 204 on a successful HTTP DELETE%s', async (query) => {
    prisma.environment.findFirst.mockResolvedValue(null)
    prisma.cluster.delete.mockResolvedValue(makeClusterListRecord())
    auth.authenticate.mockResolvedValue({ userId, adminPermissions: ADMIN_PERMS.MANAGE, userType: 'human' })
    const clusterId = faker.string.uuid()

    const app = module.createNestApplication(new FastifyAdapter())
    await app.init()
    const response = await app.getHttpAdapter().getInstance().inject({
      method: 'DELETE',
      url: `/api/v1/clusters/${clusterId}${query}`,
    })
    await app.close()

    expect(response.statusCode).toBe(204)
  })
})
