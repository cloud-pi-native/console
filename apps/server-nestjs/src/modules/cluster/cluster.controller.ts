import type { ClientInferResponseBody } from '@ts-rest/core'
import type { FastifyRequest } from 'fastify'
import type { UserContext } from '../infrastructure/auth/auth-user.decorator'
import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Inject, Param, Post, Put, Req } from '@nestjs/common'
import { AuthUser } from '../infrastructure/auth/auth-user.decorator'
import { ZodValidationPipe } from '../infrastructure/pipe/zod-validation.pipe'
import { clusterContract } from '@cpn-console/shared'
import { ClusterService } from './cluster.service'

type ClusterList = ClientInferResponseBody<typeof clusterContract.listClusters, 200>
type ClusterDetails = ClientInferResponseBody<typeof clusterContract.getClusterDetails, 200>
type ClusterUsage = ClientInferResponseBody<typeof clusterContract.getClusterUsage, 200>
type CreateClusterBody = typeof clusterContract.createCluster.body._type
type UpdateClusterBody = typeof clusterContract.updateCluster.body._type

@Controller('api/v1/clusters')
export class ClusterController {
  constructor(@Inject(ClusterService) private readonly clusterService: ClusterService) {}

  @Get('')
  list(): Promise<ClusterList> {
    return this.clusterService.listClusters()
  }

  @Get(':clusterId')
  getDetails(@Param('clusterId') clusterId: string): Promise<ClusterDetails> {
    return this.clusterService.getClusterDetails(clusterId)
  }

  @Get(':clusterId/usage')
  getUsage(@Param('clusterId') clusterId: string): Promise<ClusterUsage> {
    return this.clusterService.getClusterUsage(clusterId)
  }

  @Get(':clusterId/environments')
  getEnvironments(@Param('clusterId') clusterId: string): Promise<unknown[]> {
    return this.clusterService.getClusterAssociatedEnvironments(clusterId)
  }

  @Post('')
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body(new ZodValidationPipe(clusterContract.createCluster.body)) data: CreateClusterBody,
    @AuthUser() user: UserContext,
    @Req() request: FastifyRequest,
  ): Promise<ClusterDetails> {
    return this.clusterService.createCluster(data, user.userId, request.id)
  }

  @Put(':clusterId')
  @HttpCode(HttpStatus.OK)
  update(
    @Param('clusterId') clusterId: string,
    @Body(new ZodValidationPipe(clusterContract.updateCluster.body)) data: UpdateClusterBody,
    @AuthUser() user: UserContext,
    @Req() request: FastifyRequest,
  ): Promise<ClusterDetails> {
    return this.clusterService.updateCluster(data, clusterId, user.userId, request.id)
  }

  @Delete(':clusterId')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(
    @Param('clusterId') clusterId: string,
    @AuthUser() user: UserContext,
    @Req() request: FastifyRequest,
  ): Promise<string | null> {
    return this.clusterService.deleteCluster({
      clusterId,
      userId: user.userId,
      requestId: request.id,
    })
  }
}
