import type { Zone as ZoneType } from './zone-queries.utils'
import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { PrismaService } from '../infrastructure/database/prisma.service'
import { LogService } from '../log/log.service'
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

    await this.logs.addLog({
      action: 'Create zone',
      data: { zone, ...(data.clusterIds ? { clusterIds: data.clusterIds } : {}) },
      userId,
      requestId,
    })
    await this.eventEmitter.emitAsync('zone.upsert', zone)
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

    await this.logs.addLog({ action: 'Update zone', data: { zone }, userId, requestId })
    await this.eventEmitter.emitAsync('zone.upsert', zone)
    return zone
  }

  async delete(zoneId: string, userId: string, requestId: string): Promise<void> {
    const attachedCluster = await this.prisma.cluster.findFirst({ where: { zoneId }, select: { id: true } })
    if (attachedCluster) {
      throw new BadRequestException('Vous ne pouvez supprimer cette zone, car des clusters y sont associés.')
    }

    const zone = await deleteZone(this.prisma, zoneId)

    await this.logs.addLog({ action: 'Delete zone', data: { zone }, userId, requestId })
    await this.eventEmitter.emitAsync('zone.delete', zone)
  }
}
