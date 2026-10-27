import type { ExperimentalFeatureRequest, ExperimentalFeatureScope } from '@cpn-console/shared'
import { ExperimentalFeatureScopeSchema } from '@cpn-console/shared'
import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../infrastructure/database/prisma.service'
import {
  createExperimentalFeatureEvent,
  getExperimentalFeatureScopeCount,
  getExperimentalFeatureTarget,
  getUpdatedExperimentalFeatureTarget,
  listExperimentalFeatureTargets,
  updateExperimentalFeatureRequest,
  upsertExperimentalFeatureTarget,
} from './experimental-feature-queries.utils'

@Injectable()
export class ExperimentalFeatureService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  list() {
    return listExperimentalFeatureTargets(this.prisma)
  }

  authorize(scope: ExperimentalFeatureScope, actorId: string) {
    return this.prisma.$transaction(async (tx) => {
      if (await getExperimentalFeatureScopeCount(tx, scope) === 0) {
        throw new NotFoundException(`Périmètre ${scope.kind} ${scope.id} introuvable ou archivé`)
      }
      return upsertExperimentalFeatureTarget(tx, scope, actorId)
    })
  }

  request(id: string, request: ExperimentalFeatureRequest, actorId: string) {
    return this.prisma.$transaction(async (tx) => {
      const target = await getExperimentalFeatureTarget(tx, id)
      if (!target) throw new NotFoundException(`Périmètre autorisé ${id} introuvable`)
      if (target.revision !== request.expectedRevision) {
        throw new ConflictException(`La révision du périmètre ${id} a changé ; actualisez la page`)
      }
      if (request.requested) {
        const scope = ExperimentalFeatureScopeSchema.parse({ kind: target.scopeKind, id: target.scopeId })
        if (await getExperimentalFeatureScopeCount(tx, scope) === 0) {
          throw new NotFoundException(`Périmètre ${scope.kind} ${scope.id} introuvable ou archivé`)
        }
      }
      const updated = await updateExperimentalFeatureRequest(tx, id, request)
      if (updated.count !== 1) {
        throw new ConflictException(`La révision du périmètre ${id} a changé ; actualisez la page`)
      }
      await createExperimentalFeatureEvent(tx, id, request, actorId)
      return getUpdatedExperimentalFeatureTarget(tx, id)
    })
  }
}
