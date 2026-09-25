import type { clusterContract, CreateClusterBody, DeleteClusterQuery, UpdateClusterBody } from '@cpn-console/shared'
import type { ClientInferResponseBody } from '@ts-rest/core'
import type { FastifyRequest } from 'fastify'
import type { UserContext } from '../infrastructure/auth/auth-user.decorator'
import {
  CreateClusterBodySchema,
  DeleteClusterQuerySchema,
  UpdateClusterBodySchema,
} from '@cpn-console/shared'
import { BadRequestException, Body, ConflictException, Controller, Delete, Get, HttpCode, HttpStatus, Inject, NotFoundException, Param, Post, Put, Query, Req, UnprocessableEntityException, UseGuards } from '@nestjs/common'
import { Effect } from 'effect'
import { AuthUser } from '../infrastructure/auth/auth-user.decorator'
import { RequireAdminPermission } from '../infrastructure/permission/user/user-admin-permission.decorator'
import { UserGuard } from '../infrastructure/permission/user/user.guard'
import { ZodValidationPipe } from '../infrastructure/pipe/zod-validation.pipe'
import {
  ClusterNotFound,
  ClusterService,
  EnvironmentsActive,
  HookFailed,
  LabelTaken,
} from './cluster.service'

type ClusterList = ClientInferResponseBody<typeof clusterContract.listClusters, 200>
type ClusterDetails = ClientInferResponseBody<typeof clusterContract.getClusterDetails, 200>
type ClusterUsage = ClientInferResponseBody<typeof clusterContract.getClusterUsage, 200>

// presentation: domain errors -> HTTP responses
function toHttpError(clusterId: string | undefined) {
  return (error: unknown): Error => {
    if (error instanceof ClusterNotFound) return new NotFoundException(clusterId ?? error.clusterId)
    if (error instanceof LabelTaken) return new ConflictException('Ce label existe déjà pour un autre cluster')
    if (error instanceof EnvironmentsActive) return new BadRequestException('Impossible de supprimer le cluster, des environnements en activité y sont déployés')
    if (error instanceof HookFailed) return new UnprocessableEntityException('Echec des services à la création/mise à jour du cluster')
    if (error instanceof Error) return error
    return new Error(String(error))
  }
}

@Controller('api/v1/clusters')
@UseGuards(UserGuard)
export class ClusterController {
  constructor(@Inject(ClusterService) private readonly clusterService: ClusterService) {}

  // decode -> service -> run -> encode
  private run<A>(effect: Effect.Effect<A, unknown>, clusterId?: string): Promise<A> {
    return Effect.runPromise(Effect.catchAll(effect, error => Effect.fail(toHttpError(clusterId)(error))))
  }

  @Get('')
  @RequireAdminPermission('ListClusters')
  list(): Promise<ClusterList> {
    return this.run(this.clusterService.listClusters())
  }

  @Get(':clusterId')
  @RequireAdminPermission('ListClusters')
  getDetails(@Param('clusterId') clusterId: string): Promise<ClusterDetails> {
    return this.run(this.clusterService.getClusterDetails(clusterId), clusterId)
  }

  @Get(':clusterId/usage')
  @RequireAdminPermission('ListClusters')
  getUsage(@Param('clusterId') clusterId: string): Promise<ClusterUsage> {
    return this.run(this.clusterService.getClusterUsage(clusterId), clusterId)
  }

  @Get(':clusterId/environments')
  @RequireAdminPermission('ListClusters')
  getEnvironments(@Param('clusterId') clusterId: string): Promise<unknown[]> {
    return this.run(this.clusterService.getClusterAssociatedEnvironments(clusterId), clusterId)
  }

  @Post('')
  @RequireAdminPermission('ManageClusters')
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body(new ZodValidationPipe(CreateClusterBodySchema)) data: CreateClusterBody,
    @AuthUser() user: UserContext,
    @Req() request: FastifyRequest,
  ): Promise<ClusterDetails> {
    return this.run(this.clusterService.createCluster(data, user.userId, request.id))
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
    return this.run(this.clusterService.updateCluster(data, clusterId, user.userId, request.id), clusterId)
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
    return this.run(this.clusterService.deleteCluster({ clusterId, userId: user.userId, requestId: request.id, force }), clusterId)
  }
}
