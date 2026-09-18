import type { clusterContract, CreateClusterBody, DeleteClusterQuery, UpdateClusterBody } from '@cpn-console/shared'
import type { ClientInferResponseBody } from '@ts-rest/core'
import type { FastifyRequest } from 'fastify'
import type { UserContext } from '../infrastructure/auth/auth-user.decorator'
import {
  CreateClusterBodySchema,
  DeleteClusterQuerySchema,
  UpdateClusterBodySchema,
} from '@cpn-console/shared'
import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Inject, Param, Post, Put, Query, Req, UseGuards } from '@nestjs/common'
import { AuthUser } from '../infrastructure/auth/auth-user.decorator'
import { RequireAdminPermission } from '../infrastructure/permission/user/user-admin-permission.decorator'
import { UserGuard } from '../infrastructure/permission/user/user.guard'
import { ZodValidationPipe } from '../infrastructure/pipe/zod-validation.pipe'
import { ClusterService } from './cluster.service'

type ClusterList = ClientInferResponseBody<typeof clusterContract.listClusters, 200>
type ClusterDetails = ClientInferResponseBody<typeof clusterContract.getClusterDetails, 200>
type ClusterUsage = ClientInferResponseBody<typeof clusterContract.getClusterUsage, 200>

@Controller('api/v1/clusters')
@UseGuards(UserGuard)
export class ClusterController {
  constructor(@Inject(ClusterService) private readonly clusterService: ClusterService) {}

  @Get('')
  @RequireAdminPermission('ListClusters')
  list(): Promise<ClusterList> {
    return this.clusterService.listClusters()
  }

  @Get(':clusterId')
  @RequireAdminPermission('ListClusters')
  getDetails(@Param('clusterId') clusterId: string): Promise<ClusterDetails> {
    return this.clusterService.getClusterDetails(clusterId)
  }

  @Get(':clusterId/usage')
  @RequireAdminPermission('ListClusters')
  getUsage(@Param('clusterId') clusterId: string): Promise<ClusterUsage> {
    return this.clusterService.getClusterUsage(clusterId)
  }

  @Get(':clusterId/environments')
  @RequireAdminPermission('ListClusters')
  getEnvironments(@Param('clusterId') clusterId: string): Promise<unknown[]> {
    return this.clusterService.getClusterAssociatedEnvironments(clusterId)
  }

  @Post('')
  @RequireAdminPermission('ManageClusters')
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body(new ZodValidationPipe(CreateClusterBodySchema)) data: CreateClusterBody,
    @AuthUser() user: UserContext,
    @Req() request: FastifyRequest,
  ): Promise<ClusterDetails> {
    return this.clusterService.createCluster(data, user.userId, request.id)
  }

  @Put(':clusterId')
  @RequireAdminPermission('ManageClusters')
  @HttpCode(HttpStatus.OK)
  update(
    @Param('clusterId') clusterId: string,
    @Body(new ZodValidationPipe(UpdateClusterBodySchema)) data: UpdateClusterBody,
    @AuthUser() user: UserContext,
    @Req() request: FastifyRequest,
  ): Promise<ClusterDetails> {
    return this.clusterService.updateCluster(data, clusterId, user.userId, request.id)
  }

  @Delete(':clusterId')
  @RequireAdminPermission('ManageClusters')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(
    @Param('clusterId') clusterId: string,
    @Query(new ZodValidationPipe(DeleteClusterQuerySchema)) { force }: DeleteClusterQuery,
    @AuthUser() user: UserContext,
    @Req() request: FastifyRequest,
  ): Promise<string | null> {
    return this.clusterService.deleteCluster({
      clusterId,
      userId: user.userId,
      requestId: request.id,
      force,
    })
  }
}
