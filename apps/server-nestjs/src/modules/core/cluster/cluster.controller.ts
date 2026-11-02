import type { CleanedCluster, ClusterAssociatedEnvironments, ClusterDetails, ClusterUsage, CreateClusterBody, DeleteClusterQuery, UpdateClusterBody } from '@cpn-console/shared'
import type { Layer } from 'effect'
import type { FastifyRequest } from 'fastify'
import type { UserContext } from '../../infrastructure/auth/auth-user.decorator'
import type { AppEvents, Prisma } from './cluster-context'
import type { ClusterError } from './cluster-errors'
import type { ClusterDetailsRecord, ClusterEnvironmentsRecord, ClusterListRecord } from './cluster-queries.utils'
import {
  CreateClusterBodySchema,
  DeleteClusterQuerySchema,
  KubeconfigSchema,
  UpdateClusterBodySchema,
} from '@cpn-console/shared'
import { BadRequestException, Body, ConflictException, Controller, Delete, Get, HttpCode, HttpStatus, Inject, NotFoundException, Param, ParseUUIDPipe, Post, Put, Query, Req, UnprocessableEntityException, UseGuards } from '@nestjs/common'
import { Effect, Match } from 'effect'
import { AuthUser } from '../../infrastructure/auth/auth-user.decorator'
import { PrismaService } from '../../infrastructure/database/prisma.service'
import { RequireAdminPermission } from '../../infrastructure/permission/user/user-admin-permission.decorator'
import { UserGuard } from '../../infrastructure/permission/user/user.guard'
import { ZodValidationPipe } from '../../infrastructure/pipe/zod-validation.pipe'
import { AppEventsService } from '../events/app-events.service'
import { makeClusterLayer } from './cluster-context'
import {
  createCluster,
  deleteCluster,
  getClusterAssociatedEnvironments,
  getClusterDetailsRecord,
  getClusterUsage,
  listClustersForUser,
  updateCluster,
} from './cluster.service'

// Exhaustive over ClusterError: a new tag fails to compile until matched here.
function toHttpException(error: ClusterError): Error {
  return Match.value(error).pipe(
    Match.tagsExhaustive({
      ClusterNotFound: () => new NotFoundException('Cluster not found'),
      LabelTaken: () => new ConflictException('Ce label existe déjà pour un autre cluster'),
      EnvironmentsActive: () => new BadRequestException('Impossible de supprimer le cluster, des environnements en activité y sont déployés'),
      HookFailed: ({ event }) => new UnprocessableEntityException(`Echec des services (${event})`),
    }),
  )
}

// Record → contract mappers: the only place the raw Prisma record shape leaks
// past the controller.
export function toClusters(records: ClusterListRecord[]): CleanedCluster[] {
  return records.map((record) => {
    const { stages, infos, secretName, kubeConfigId, createdAt, updatedAt, ...cluster } = record
    return {
      ...cluster,
      infos: infos ?? '',
      stageIds: stages.map(({ id }) => id),
    }
  })
}

export function toClusterDetails(record: ClusterDetailsRecord): ClusterDetails {
  const { infos, projects, stages, kubeconfig, secretName, kubeConfigId, createdAt, updatedAt, ...details } = record
  return {
    ...details,
    infos: infos ?? '',
    projectIds: projects.map(project => project.id),
    stageIds: stages.map(({ id }) => id),
    kubeconfig: {
      cluster: KubeconfigSchema.shape.cluster.passthrough().parse(kubeconfig.cluster),
      user: KubeconfigSchema.shape.user.passthrough().parse(kubeconfig.user),
    },
  }
}

function toClusterAssociatedEnvironments(records: ClusterEnvironmentsRecord[]): ClusterAssociatedEnvironments {
  return records.map(environment => ({
    project: environment.project?.name,
    name: environment.name,
    owner: environment.project?.owner.email,
    cpu: environment.cpu,
    gpu: environment.gpu,
    memory: environment.memory,
  }))
}

@Controller('api/v1/clusters')
@UseGuards(UserGuard)
export class ClusterController {
  private readonly layer: Layer.Layer<Prisma | AppEvents>

  constructor(
    @Inject(PrismaService) prisma: PrismaService,
    @Inject(AppEventsService) appEvents: AppEventsService,
  ) {
    this.layer = makeClusterLayer(prisma, appEvents)
  }

  @Get('')
  list(@AuthUser() user: UserContext): Promise<CleanedCluster[]> {
    return Effect.runPromise(Effect.provide(Effect.map(listClustersForUser(user), toClusters), this.layer))
  }

  @Get(':clusterId')
  @RequireAdminPermission('ListClusters')
  getDetails(@Param('clusterId', ParseUUIDPipe) clusterId: string): Promise<ClusterDetails> {
    return Effect.runPromise(
      Effect.provide(
        Effect.map(getClusterDetailsRecord(clusterId), toClusterDetails),
        this.layer,
      ).pipe(Effect.mapError(toHttpException), Effect.orDie),
    )
  }

  @Get('usage/:clusterId')
  @RequireAdminPermission('ListClusters')
  getUsage(@Param('clusterId', ParseUUIDPipe) clusterId: string): Promise<ClusterUsage> {
    return Effect.runPromise(Effect.provide(getClusterUsage(clusterId), this.layer))
  }

  @Get(':clusterId/environments')
  @RequireAdminPermission('ListClusters')
  getEnvironments(@Param('clusterId', ParseUUIDPipe) clusterId: string): Promise<ClusterAssociatedEnvironments> {
    return Effect.runPromise(Effect.provide(Effect.map(getClusterAssociatedEnvironments(clusterId), toClusterAssociatedEnvironments), this.layer))
  }

  @Post('')
  @RequireAdminPermission('ManageClusters')
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body(new ZodValidationPipe(CreateClusterBodySchema)) data: CreateClusterBody,
    @AuthUser() user: UserContext,
    @Req() request: FastifyRequest,
  ): Promise<ClusterDetails> {
    return Effect.runPromise(
      Effect.provide(
        Effect.map(createCluster(data, user.userId, request.id), toClusterDetails),
        this.layer,
      ).pipe(Effect.mapError(toHttpException), Effect.orDie),
    )
  }

  @Put(':clusterId')
  @RequireAdminPermission('ManageClusters')
  @HttpCode(HttpStatus.OK)
  update(
    @Param('clusterId', ParseUUIDPipe) clusterId: string,
    @Body(new ZodValidationPipe(UpdateClusterBodySchema)) data: UpdateClusterBody,
    @AuthUser() user: UserContext,
    @Req() request: FastifyRequest,
  ): Promise<ClusterDetails> {
    return Effect.runPromise(
      Effect.provide(
        Effect.map(updateCluster(data, clusterId, user.userId, request.id), toClusterDetails),
        this.layer,
      ).pipe(Effect.mapError(toHttpException), Effect.orDie),
    )
  }

  @Delete(':clusterId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequireAdminPermission('ManageClusters')
  async delete(
    @Param('clusterId', ParseUUIDPipe) clusterId: string,
    @Query(new ZodValidationPipe(DeleteClusterQuerySchema)) { force }: DeleteClusterQuery,
    @AuthUser() user: UserContext,
    @Req() request: FastifyRequest,
  ): Promise<string | null> {
    const forcedCount = await Effect.runPromise(
      Effect.provide(deleteCluster({
        clusterId,
        userId: user.userId,
        requestId: request.id,
        force,
      }), this.layer).pipe(Effect.mapError(toHttpException), Effect.orDie),
    )
    if (!forcedCount) return null
    return `${forcedCount} environnements supprimés de force, n'oubliez pas de reprovisionner les projets concernés`
  }
}
