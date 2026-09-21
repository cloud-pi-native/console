import type {
  CleanedCluster,
  clusterContract,
  ClusterDetails,
  CreateClusterBody,
  UpdateClusterBody,
} from '@cpn-console/shared'
import type { ConfigType } from '@nestjs/config'
import type { User } from '@prisma/client'
import type { ClientInferResponseBody } from '@ts-rest/core'
import type { ClusterDeps } from './cluster.pipeline'
import { Inject, Injectable } from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { Effect } from 'effect'
import { baseConfigFactory } from '../../config/base.config'
import { PrismaService } from '../infrastructure/database/prisma.service'
import { LogService } from '../log/log.service'
import {
  createCluster,
  deleteCluster,
  getClusterAssociatedEnvironments,
  getClusterDetails,
  getClusterUsage,
  listClusters,
  updateCluster,
} from './cluster.pipeline'

type ClusterUsage = ClientInferResponseBody<typeof clusterContract.getClusterUsage, 200>

@Injectable()
export class ClusterService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(EventEmitter2) private readonly eventEmitter: EventEmitter2,
    @Inject(LogService) private readonly logs: LogService,
    @Inject(baseConfigFactory.KEY) private readonly baseConfig: ConfigType<typeof baseConfigFactory>,
  ) {}

  private deps(): ClusterDeps {
    return { prisma: this.prisma, eventEmitter: this.eventEmitter, logs: this.logs }
  }

  listClusters(userId?: User['id']): Effect.Effect<CleanedCluster[], unknown> {
    return Effect.gen(this, function* () {
      return yield* listClusters(this.prisma, userId)
    })
  }

  getClusterDetails(clusterId: string): Effect.Effect<ClusterDetails, unknown> {
    return Effect.gen(this, function* () {
      return yield* getClusterDetails(this.prisma, clusterId)
    })
  }

  getClusterUsage(clusterId: string): Effect.Effect<ClusterUsage, unknown> {
    return Effect.gen(this, function* () {
      return yield* getClusterUsage(this.prisma, clusterId)
    })
  }

  getClusterAssociatedEnvironments(clusterId: string): Effect.Effect<Effect.Effect.Success<ReturnType<typeof getClusterAssociatedEnvironments>>, unknown> {
    return Effect.gen(this, function* () {
      return yield* getClusterAssociatedEnvironments(this.prisma, clusterId)
    })
  }

  createCluster(data: CreateClusterBody, userId: User['id'], requestId: string): Effect.Effect<ClusterDetails, unknown> {
    return Effect.gen(this, function* () {
      return yield* createCluster(this.deps(), data, userId, requestId)
    })
  }

  updateCluster(data: UpdateClusterBody, clusterId: string, userId: User['id'], requestId: string): Effect.Effect<ClusterDetails, unknown> {
    return Effect.gen(this, function* () {
      return yield* updateCluster(this.deps(), data, clusterId, userId, requestId)
    })
  }

  deleteCluster({ clusterId, userId, requestId, force }: {
    clusterId: string
    userId?: string
    requestId: string
    force?: boolean
  }): Effect.Effect<string | null, unknown> {
    return Effect.gen(this, function* () {
      return yield* deleteCluster(this.deps(), clusterId, userId ?? '', requestId, force)
    })
  }
}
