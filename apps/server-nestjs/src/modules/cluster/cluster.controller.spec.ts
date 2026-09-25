import type { TestingModule } from '@nestjs/testing'
import type { MockProxy } from 'vitest-mock-extended'
import type { FastifyRequest } from 'fastify'
import type { UserContext } from '../infrastructure/auth/auth-user.decorator'
import { faker } from '@faker-js/faker'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it } from 'vitest'
import { mock } from 'vitest-mock-extended'
import { ADMIN_PERMISSIONS_KEY } from '../infrastructure/permission/user/user-admin-permission.decorator'
import { UserGuard } from '../infrastructure/permission/user/user.guard'
import { makeClusterDetailsRecord, makeClusterListRecord } from './cluster-testing.utils'
import { ClusterController } from './cluster.controller'
import { ClusterService } from './cluster.service'

describe('clusterController', () => {
  let module: TestingModule
  let controller: ClusterController
  let service: MockProxy<ClusterService>

  const user = { userId: faker.string.uuid() } as UserContext
  const request = { id: faker.string.uuid() } as FastifyRequest

  beforeEach(async () => {
    service = mock<ClusterService>()

    module = await Test.createTestingModule({
      controllers: [ClusterController],
      providers: [
        { provide: ClusterService, useValue: service },
      ],
    })
      .overrideGuard(UserGuard)
      .useValue({ canActivate: () => true })
      .compile()

    controller = module.get<ClusterController>(ClusterController)
  })

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })

  it('guards reads with ListClusters', () => {
    for (const handler of [ClusterController.prototype.list, ClusterController.prototype.getDetails, ClusterController.prototype.getUsage, ClusterController.prototype.getEnvironments]) {
      expect(Reflect.getMetadata(ADMIN_PERMISSIONS_KEY, handler)).toEqual(['ListClusters'])
    }
  })

  it('guards mutations with ManageClusters', () => {
    for (const handler of [ClusterController.prototype.create, ClusterController.prototype.update, ClusterController.prototype.delete]) {
      expect(Reflect.getMetadata(ADMIN_PERMISSIONS_KEY, handler)).toEqual(['ManageClusters'])
    }
  })

  it('delegates list to the service', async () => {
    const clusters = [makeClusterListRecord()]
    service.listClusters.mockResolvedValue(clusters as never)

    expect(await controller.list()).toBe(clusters)
    expect(service.listClusters).toHaveBeenCalledTimes(1)
  })

  it('delegates details, usage and environments with clusterId', async () => {
    const clusterId = faker.string.uuid()
    const details = makeClusterDetailsRecord()
    service.getClusterDetails.mockResolvedValue(details as never)
    service.getClusterUsage.mockResolvedValue({} as never)
    service.getClusterAssociatedEnvironments.mockResolvedValue([])

    expect(await controller.getDetails(clusterId)).toBe(details)
    expect(service.getClusterDetails).toHaveBeenCalledWith(clusterId)
    await controller.getUsage(clusterId)
    expect(service.getClusterUsage).toHaveBeenCalledWith(clusterId)
    await controller.getEnvironments(clusterId)
    expect(service.getClusterAssociatedEnvironments).toHaveBeenCalledWith(clusterId)
  })

  it('delegates create with body, userId and requestId', async () => {
    const details = makeClusterDetailsRecord()
    service.createCluster.mockResolvedValue(details as never)

    expect(await controller.create(details as never, user, request)).toBe(details)
    expect(service.createCluster).toHaveBeenCalledWith(details, user.userId, request.id)
  })

  it('delegates update with clusterId, body, userId and requestId', async () => {
    const clusterId = faker.string.uuid()
    const details = makeClusterDetailsRecord()
    service.updateCluster.mockResolvedValue(details as never)

    expect(await controller.update(clusterId, { label: 'new' } as never, user, request)).toBe(details)
    expect(service.updateCluster).toHaveBeenCalledWith({ label: 'new' }, clusterId, user.userId, request.id)
  })

  it('delegates delete with clusterId, userId, requestId and force', async () => {
    const clusterId = faker.string.uuid()
    service.deleteCluster.mockResolvedValue(null)

    await controller.delete(clusterId, { force: true } as never, user, request)
    expect(service.deleteCluster).toHaveBeenCalledWith({
      clusterId,
      userId: user.userId,
      requestId: request.id,
      force: true,
    })
  })
})
