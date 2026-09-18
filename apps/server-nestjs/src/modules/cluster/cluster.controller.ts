import type { DeleteClusterQuerySchema, CreateClusterBody, DeleteClusterQuery, UpdateClusterBody } from '@cpn-console/shared'
import type { CleanedCluster, ClusterAssociatedEnvironments, ClusterDetails, ClusterUsage, CreateClusterBody, DeleteClusterQuery, UpdateClusterBody } from '@cpn-console/shared'
import type { FastifyRequest } from 'fastify'
import type { UserContext } from '../infrastructure/auth/auth-user.decorator'
import type { ClusterDetailsRecord } from './cluster-queries.utils'
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
import { toClusterAssociatedEnvironments, toClusterDetails, toClusters } from './cluster.utils'

@Controller('api/v1/clusters')
@UseGuards(UserGuard)
export class ClusterController {
  constructor(@Inject(ClusterService) private readonly clusterService: ClusterService) {}

  @Get('')
  async list(@AuthUser() user: UserContext): Promise<CleanedCluster[]> {
    return toClusters(await this.clusterService.listClustersForUser(user))
  }

  @Get(':clusterId')
  @RequireAdminPermission('ListClusters')
  async getDetails(@Param('clusterId') clusterId: string): Promise<ClusterDetails> {
    return toClusterDetails(await this.clusterService.getClusterDetailsRecord(clusterId))
  }

  @Get('usage/:clusterId')
  @RequireAdminPermission('ListClusters')
  getUsage(@Param('clusterId') clusterId: string): Promise<ClusterUsage> {
    return this.clusterService.getClusterUsage(clusterId)
  }

  @Get(':clusterId/environments')
  @RequireAdminPermission('ListClusters')
  async getEnvironments(@Param('clusterId') clusterId: string): Promise<ClusterAssociatedEnvironments> {
    return toClusterAssociatedEnvironments(await this.clusterService.getClusterAssociatedEnvironments(clusterId))
  }

  @Post('')
  @RequireAdminPermission('ManageClusters')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body(new ZodValidationPipe(CreateClusterBodySchema)) data: CreateClusterBody,
    @AuthUser() user: UserContext,
    @Req() request: FastifyRequest,
  ): Promise<ClusterDetails> {
    const record: ClusterDetailsRecord = await this.clusterService.createCluster(data, user.userId, request.id)
    return toClusterDetails(record)
  }

  @Put(':clusterId')
  @RequireAdminPermission('ManageClusters')
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('clusterId') clusterId: string,
    @Body(new ZodValidationPipe(UpdateClusterBodySchema)) data: UpdateClusterBody,
    @AuthUser() user: UserContext,
    @Req() request: FastifyRequest,
  ): Promise<ClusterDetails> {
    const record = await this.clusterService.updateCluster(data, clusterId, user.userId, request.id)
    return toClusterDetails(record)
  }

  @Delete(':clusterId')
  @RequireAdminPermission('ManageClusters')
  async delete(
    @Param('clusterId') clusterId: string,
    @Query(new ZodValidationPipe(DeleteClusterQuerySchema)) { force }: DeleteClusterQuery,
    @AuthUser() user: UserContext,
    @Req() request: FastifyRequest,
  ): Promise<string | null> {
    const forcedCount = await this.clusterService.deleteCluster({
      clusterId,
      userId: user.userId,
      requestId: request.id,
      force,
    })
    if (!forcedCount) return null
    return `${forcedCount} environnements supprimés de force, n'oubliez pas de reprovisionner les projets concernés`
  }
}
