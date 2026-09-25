import type { Zone as ZoneType } from './zone-queries.utils'
import { BadRequestException, Inject, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { isPluginResults } from '../events/app-events.utils'
import { PrismaService } from '../infrastructure/database/prisma.service'
import { LogService } from '../log/log.service'
import { getFailedPlugins, mergePluginResults } from '../plugin/plugin.utils'
import { createZoneWithClusters, deleteZone, getZoneById, listZones, updateZone } from './zone-queries.utils'

interface CreateZoneData {
  slug: string
  label: string
  argocdUrl: string
  description?: string | null
  clusterIds?: string[]
}

interface UpdateZoneData {
  label: string
  argocdUrl: string
  description?: string | null
}

type ZoneEventName = 'zone.upsert' | 'zone.delete'

type ZoneLogAction = 'Create zone' | 'Update zone' | 'Delete zone'

@Injectable()
export class ZoneService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(LogService) private readonly logs: LogService,
    @Inject(EventEmitter2) private readonly eventEmitter: EventEmitter2,
  ) {}

  async list(): Promise<ZoneType[]> {
    return listZones(this.prisma)
  }

  async create(data: CreateZoneData, userId: string, requestId: string): Promise<ZoneType> {
    const existing = await this.prisma.zone.findUnique({ where: { slug: data.slug } })
    if (existing) throw new BadRequestException(`Une zone portant le nom ${data.slug} existe déjà.`)

    const zone = await this.prisma.$transaction(tx => createZoneWithClusters(tx, {
      slug: data.slug,
      label: data.label,
      argocdUrl: data.argocdUrl,
      description: data.description ?? null,
    }, data.clusterIds))

    await this.reconcile(
      'zone.upsert',
      zone,
      'Create zone',
      userId,
      requestId,
      'Echec des services lors de la création de la zone',
      data.clusterIds ? { clusterIds: data.clusterIds } : {},
    )
    return zone
  }

  async update(zoneId: string, data: UpdateZoneData, userId: string, requestId: string): Promise<ZoneType> {
    const existing = await getZoneById(this.prisma, zoneId)
    if (!existing) throw new NotFoundException('Zone non trouvée')

    const zone = await updateZone(this.prisma, zoneId, {
      label: data.label,
      argocdUrl: data.argocdUrl,
      description: data.description ?? null,
    })

    await this.reconcile('zone.upsert', zone, 'Update zone', userId, requestId, 'Echec des services lors de la mise à jour de la zone')
    return zone
  }

  async delete(zoneId: string, userId: string, requestId: string): Promise<void> {
    const attachedCluster = await this.prisma.cluster.findFirst({ where: { zoneId }, select: { id: true } })
    if (attachedCluster) {
      throw new BadRequestException('Vous ne pouvez supprimer cette zone, car des clusters y sont associés.')
    }

    const zone = await deleteZone(this.prisma, zoneId)

    await this.reconcile('zone.delete', zone, 'Delete zone', userId, requestId, 'Echec des services lors de la suppression de la zone')
  }

  /**
   * Awaits the listeners' results before answering: an unreachable service must fail the
   * request (legacy v1 returned 422) and stay visible in the admin log, instead of being
   * swallowed by a bare `emitAsync`.
   */
  private async reconcile(
    event: ZoneEventName,
    zone: ZoneType,
    action: ZoneLogAction,
    userId: string,
    requestId: string,
    failureMessage: string,
    extra: Record<string, unknown> = {},
  ): Promise<void> {
    const responses = await this.eventEmitter.emitAsync(event, zone)
    const results = mergePluginResults(responses.filter(isPluginResults))

    await this.logs.addLog({
      action,
      data: { zone, ...extra, ...results },
      userId,
      requestId,
    })

    if (getFailedPlugins(results).length) {
      throw new UnprocessableEntityException(failureMessage)
    }
  }
}