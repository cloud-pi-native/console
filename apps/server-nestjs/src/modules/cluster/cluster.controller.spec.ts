import type { TestingModule } from '@nestjs/testing'
import type { FastifyRequest } from 'fastify'
import type { MockProxy } from 'vitest-mock-extended'
import type { UserContext } from '../infrastructure/auth/auth-user.decorator'
import { ADMIN_PERMS } from '@cpn-console/shared'
import { faker } from '@faker-js/faker'
import { FastifyAdapter } from '@nestjs/platform-fastify'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it } from 'vitest'
import { mock } from 'vitest-mock-extended'
import { AuthService } from '../infrastructure/auth/auth.service'
import { UserPermissionPolicy } from '../infrastructure/permission/user/user-policy.service'
import { UserPermissionService } from '../infrastructure/permission/user/user.service'
import {
  makeClusterDetailsRecord,
  makeClusterEnvironmentsRecord,
  makeClusterListRecord,
  makeCreateClusterBody,
} from './cluster-testing.utils'
import { ClusterController } from './cluster.controller'
import { ClusterService } from './cluster.service'
import { toClusterDetails, toClusters } from './cluster.utils'

describe('clusterController', () => {
  let module: TestingModule
  let controller: ClusterController
  let service: MockProxy<ClusterService>
  let auth: MockProxy<AuthService>

  const userId = faker.string.uuid()
  const request = mock<FastifyRequest>({ id: faker.string.uuid() })
  const user: UserContext = { userId, userType: 'human' }

  beforeEach(async () => {
    service = mock<ClusterService>()
    auth = mock<AuthService>()

    module = await Test.createTestingModule({
      controllers: [ClusterController],
      providers: [
        { provide: ClusterService, useValue: service },
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
      service.listClustersForUser.mockResolvedValue(clusters)
      auth.authenticate.mockResolvedValue(requestor)

      const app = module.createNestApplication(new FastifyAdapter())
      await app.init()
      const response = await app.getHttpAdapter().getInstance().inject({ method: 'GET', url: '/api/v1/clusters' })
      await app.close()

      expect(response.statusCode).toBe(200)
      expect(service.listClustersForUser).toHaveBeenCalledWith(requestor)
    })
  })

  it('maps raw list records to the contract shape', async () => {
    const record = makeClusterListRecord({ infos: null })
    service.listClustersForUser.mockResolvedValue([record])

    const result = await controller.list({ userId: faker.string.uuid(), adminPermissions: ADMIN_PERMS.LIST_CLUSTERS, userType: 'human' })

    expect(result).toEqual([toClusters([record])[0]])
    expect(result[0].infos).toBe('')
    expect(result[0].stageIds).toEqual([record.stages[0].id])
  })

  it('maps cluster details to the contract shape', async () => {
    const record = makeClusterDetailsRecord({ infos: null })
    service.getClusterDetailsRecord.mockResolvedValue(record)

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
    service.getClusterAssociatedEnvironments.mockResolvedValue(envs)

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
    service.getClusterDetailsRecord.mockResolvedValue(record)
    service.getClusterUsage.mockResolvedValue(usage)
    service.getClusterAssociatedEnvironments.mockResolvedValue([])

    expect(await controller.getDetails(clusterId)).toEqual(toClusterDetails(record))
    expect(service.getClusterDetailsRecord).toHaveBeenCalledWith(clusterId)
    expect(await controller.getUsage(clusterId)).toBe(usage)
    expect(service.getClusterUsage).toHaveBeenCalledWith(clusterId)
    await controller.getEnvironments(clusterId)
    expect(service.getClusterAssociatedEnvironments).toHaveBeenCalledWith(clusterId)
  })

  it('serves the contract URL GET /api/v1/clusters/usage/:clusterId', async () => {
    const clusterId = faker.string.uuid()
    service.getClusterUsage.mockResolvedValue({ cpu: 1, gpu: 0, memory: 8 })
    service.getClusterDetailsRecord.mockResolvedValue(makeClusterDetailsRecord())
    auth.authenticate.mockResolvedValue({ userId, adminPermissions: ADMIN_PERMS.LIST_CLUSTERS, userType: 'human' })

    const app = module.createNestApplication(new FastifyAdapter())
    await app.init()
    const server = app.getHttpAdapter().getInstance()

    const usageResponse = await server.inject({ method: 'GET', url: `/api/v1/clusters/usage/${clusterId}` })
    expect(usageResponse.statusCode).toBe(200)
    expect(usageResponse.json()).toEqual({ cpu: 1, gpu: 0, memory: 8 })
    expect(service.getClusterUsage).toHaveBeenCalledWith(clusterId)

    const detailsResponse = await server.inject({ method: 'GET', url: `/api/v1/clusters/${clusterId}` })
    expect(detailsResponse.statusCode).toBe(200)
    expect(service.getClusterDetailsRecord).toHaveBeenCalledWith(clusterId)

    await app.close()
  })

  it('delegates create with body, userId and requestId', async () => {
    const body = makeCreateClusterBody()
    const record = makeClusterDetailsRecord()
    const details = toClusterDetails(record)
    service.createCluster.mockResolvedValue(record)

    expect(await controller.create(body, user, request)).toEqual(details)
    expect(service.createCluster).toHaveBeenCalledWith(body, user.userId, request.id)
  })

  it('delegates update with clusterId, body, userId and requestId', async () => {
    const clusterId = faker.string.uuid()
    const record = makeClusterDetailsRecord()
    const details = toClusterDetails(record)
    service.updateCluster.mockResolvedValue(record)

    expect(await controller.update(clusterId, { label: 'new-label' }, user, request)).toEqual(details)
    expect(service.updateCluster).toHaveBeenCalledWith({ label: 'new-label' }, clusterId, user.userId, request.id)
  })

  it('delegates delete with clusterId, userId, requestId and force', async () => {
    const clusterId = faker.string.uuid()
    service.deleteCluster.mockResolvedValue(0)

    expect(await controller.delete(clusterId, { force: true }, user, request)).toBeNull()
    expect(service.deleteCluster).toHaveBeenCalledWith({
      clusterId,
      userId: user.userId,
      requestId: request.id,
      force: true,
    })
  })

  it('formats the forced-environment message for the contract response', async () => {
    service.deleteCluster.mockResolvedValue(3)

    expect(await controller.delete(faker.string.uuid(), { force: true }, user, request))
      .toBe('3 environnements supprimés de force, n\'oubliez pas de reprovisionner les projets concernés')
  })
})
