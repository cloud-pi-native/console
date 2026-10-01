import type { CreateZoneBody, UpdateZoneBody } from '@cpn-console/shared'
import type { EventLogAction, ZoneEventName, ZoneEventPayload } from '../events/app-events.service'
import type { Zone as ZoneType } from './zone-queries.utils'
import { BadRequestException, Inject, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common'
import { AppEventsService } from '../events/app-events.service'
import { PrismaService } from '../infrastructure/database/prisma.service'
import { getFailedPlugins } from '../plugin/plugin.utils'
import { createZoneWithClusters, getZoneById, listZones, updateZone } from './zone-queries.utils'

@Injectable()
export class ZoneService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AppEventsService) private readonly appEvents: AppEventsService,
  ) {}

  async list(): Promise<ZoneType[]> {
    return listZones(this.prisma)
  }

  async create(data: CreateZoneBody, userId: string, requestId: string): Promise<ZoneType> {
    const existing = await this.prisma.zone.findUnique({ where: { slug: data.slug } })
    if (existing) throw new BadRequestException(`Une zone portant le nom ${data.slug} existe déjà.`)

    const zone = await this.prisma.$transaction(tx => createZoneWithClusters(tx, {
      slug: data.slug,
      label: data.label,
      argocdUrl: data.argocdUrl,
      description: data.description ?? null,
    }, data.clusterIds))

    await this.emitZoneEventAndThrowOnFailure(
      'zone.upsert',
      { id: zone.id, slug: zone.slug },
      'Create zone',
      userId,
      requestId,
      'Echec des services lors de la création de la zone',
    )
    return zone
  }

  async update(zoneId: string, data: UpdateZoneBody, userId: string, requestId: string): Promise<ZoneType> {
    const existing = await getZoneById(this.prisma, zoneId)
    if (!existing) throw new NotFoundException('Zone non trouvée')

    const zone = await updateZone(this.prisma, zoneId, {
      label: data.label,
      argocdUrl: data.argocdUrl,
      description: data.description ?? null,
    })

    await this.emitZoneEventAndThrowOnFailure('zone.upsert', { id: zone.id, slug: zone.slug }, 'Update zone', userId, requestId, 'Echec des services lors de la mise à jour de la zone')
    return zone
  }

  async delete(zoneId: string, userId: string, requestId: string): Promise<void> {
    const attachedCluster = await this.prisma.cluster.findFirst({ where: { zoneId }, select: { id: true } })
    if (attachedCluster) {
      throw new BadRequestException('Vous ne pouvez supprimer cette zone, car des clusters y sont associés.')
    }

    const zone = await getZoneById(this.prisma, zoneId)
    if (!zone) throw new NotFoundException('Zone non trouvée')

    await this.emitZoneEventAndThrowOnFailure('zone.delete', { id: zone.id, slug: zone.slug }, 'Delete zone', userId, requestId, 'Echec des services lors de la suppression de la zone')
    await this.prisma.zone.delete({ where: { id: zoneId } })
  }

  // Awaits the listeners' results before answering: an unreachable service must fail the
  // request (legacy v1 returned 422) and stay visible in the admin log, instead of being
  // swallowed by a bare `emitAsync`.
  private async emitZoneEventAndThrowOnFailure(
    event: ZoneEventName,
    payload: ZoneEventPayload,
    action: EventLogAction,
    userId: string,
    requestId: string,
    failureMessage: string,
  ): Promise<void> {
    const results = await this.appEvents.emitZoneEvent(event, payload, { action, userId, requestId })

    if (getFailedPlugins(results).length) {
      throw new UnprocessableEntityException(failureMessage)
    }
  }
}
