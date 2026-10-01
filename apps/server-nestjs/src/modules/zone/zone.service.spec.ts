import type { Cluster, Prisma } from '@prisma/client'
import type { DeepMockProxy } from 'vitest-mock-extended'
import { faker } from '@faker-js/faker'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it } from 'vitest'
import { mock, mockDeep } from 'vitest-mock-extended'
import { AppEventsService } from '../events/app-events.service'
import { PrismaService } from '../infrastructure/database/prisma.service'
import type { Zone as ZoneType } from './zone-queries.utils'
import { makeZone } from './zone-testing.utils'
import { ZoneService } from './zone.service'

describe('zoneService', () => {
  let service: ZoneService
  let prisma: DeepMockProxy<PrismaService>
  let appEvents: DeepMockProxy<AppEventsService>

  beforeEach(async () => {
    prisma = mockDeep<PrismaService>()
    appEvents = mockDeep<AppEventsService>()
    appEvents.emitZoneEvent.mockResolvedValue({})

    const moduleRef = await Test.createTestingModule({
      providers: [
        ZoneService,
        { provide: PrismaService, useValue: prisma },
        { provide: AppEventsService, useValue: appEvents },
      ],
    }).compile()

    service = moduleRef.get(ZoneService)
  })

  describe('list', () => {
    it('returns all zones', async () => {
      const zones = [makeZone(), makeZone()]
      prisma.zone.findMany.mockResolvedValue(zones)

      const result = await service.list()

      expect(result).toEqual(zones)
      expect(prisma.zone.findMany).toHaveBeenCalled()
    })
  })

  describe('create', () => {
    let zone: ZoneType

    beforeEach(() => {
      zone = makeZone()
    })

    it('creates a zone and connects clusters within a transaction', async () => {
      prisma.zone.findUnique.mockResolvedValue(null)
      const tx = mockDeep<Prisma.TransactionClient>()
      tx.zone.create.mockResolvedValue(zone)
      prisma.$transaction.mockImplementation(async cb => cb(tx))

      const result = await service.create(
        { slug: zone.slug, label: zone.label, argocdUrl: zone.argocdUrl, description: zone.description, clusterIds: ['cluster-1'] },
        faker.string.uuid(),
        faker.string.uuid(),
      )

      expect(result).toEqual(zone)
      expect(tx.zone.create).toHaveBeenCalled()
      expect(tx.zone.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: zone.id },
        data: { clusters: { connect: [{ id: 'cluster-1' }] } },
      }))
      expect(appEvents.emitZoneEvent).toHaveBeenCalledWith('zone.upsert', { id: zone.id, slug: zone.slug }, expect.objectContaining({ action: 'Create zone' }))
    })

    it('creates a zone without clusters', async () => {
      prisma.zone.findUnique.mockResolvedValue(null)
      const tx = mockDeep<Prisma.TransactionClient>()
      tx.zone.create.mockResolvedValue(zone)
      prisma.$transaction.mockImplementation(async cb => cb(tx))

      const result = await service.create(
        { slug: zone.slug, label: zone.label, argocdUrl: zone.argocdUrl, description: zone.description },
        faker.string.uuid(),
        faker.string.uuid(),
      )

      expect(result).toEqual(zone)
      expect(tx.zone.update).not.toHaveBeenCalled()
      expect(appEvents.emitZoneEvent).toHaveBeenCalledWith('zone.upsert', { id: zone.id, slug: zone.slug }, expect.anything())
    })

    it('throws when zone slug already exists', async () => {
      prisma.zone.findUnique.mockResolvedValue(makeZone())

      await expect(
        service.create(
          { slug: zone.slug, label: zone.label, argocdUrl: zone.argocdUrl },
          faker.string.uuid(),
          faker.string.uuid(),
        ),
      ).rejects.toThrow('Une zone portant le nom')
    })

    it('rejects with 422 when a plugin fails', async () => {
      prisma.zone.findUnique.mockResolvedValue(null)
      const tx = mockDeep<Prisma.TransactionClient>()
      tx.zone.create.mockResolvedValue(zone)
      prisma.$transaction.mockImplementation(async cb => cb(tx))
      appEvents.emitZoneEvent.mockResolvedValue({
        vault: { status: 'KO', message: 'Vault unreachable', executionTime: 1, error: new Error('boom') },
      })

      await expect(
        service.create({ slug: zone.slug, label: zone.label, argocdUrl: zone.argocdUrl }, faker.string.uuid(), faker.string.uuid()),
      ).rejects.toThrow('Echec des services lors de la création de la zone')
    })
  })

  describe('update', () => {
    let zone: ZoneType

    beforeEach(() => {
      zone = makeZone()
    })

    it('updates a zone', async () => {
      prisma.zone.findUnique.mockResolvedValue(zone)
      prisma.zone.update.mockResolvedValue(zone)

      const result = await service.update(
        zone.id,
        { label: 'new label', argocdUrl: zone.argocdUrl, description: zone.description },
        faker.string.uuid(),
        faker.string.uuid(),
      )

      expect(result).toEqual(zone)
      expect(prisma.zone.update).toHaveBeenCalledTimes(1)
      expect(appEvents.emitZoneEvent).toHaveBeenCalledWith('zone.upsert', { id: zone.id, slug: zone.slug }, expect.objectContaining({ action: 'Update zone' }))
    })

    it('throws when zone not found', async () => {
      prisma.zone.findUnique.mockResolvedValue(null)

      await expect(
        service.update(zone.id, { label: 'new label', argocdUrl: zone.argocdUrl }, faker.string.uuid(), faker.string.uuid()),
      ).rejects.toThrow('Zone non trouvée')
    })
  })

  describe('delete', () => {
    let zone: ZoneType

    beforeEach(() => {
      zone = makeZone()
    })

    it('reconciles first and deletes only on success', async () => {
      prisma.cluster.findFirst.mockResolvedValue(null)
      prisma.zone.findUnique.mockResolvedValue(zone)
      prisma.zone.delete.mockResolvedValue(zone)

      await service.delete(zone.id, faker.string.uuid(), faker.string.uuid())

      expect(appEvents.emitZoneEvent).toHaveBeenCalledWith('zone.delete', { id: zone.id, slug: zone.slug }, expect.objectContaining({ action: 'Delete zone' }))
      expect(prisma.zone.delete).toHaveBeenCalledWith({ where: { id: zone.id } })
    })

    it('keeps the zone when a plugin fails', async () => {
      prisma.cluster.findFirst.mockResolvedValue(null)
      prisma.zone.findUnique.mockResolvedValue(zone)
      appEvents.emitZoneEvent.mockResolvedValue({
        vault: { status: 'KO', message: 'Vault unreachable', executionTime: 1, error: new Error('boom') },
      })

      await expect(
        service.delete(zone.id, faker.string.uuid(), faker.string.uuid()),
      ).rejects.toThrow('Echec des services lors de la suppression de la zone')
      expect(prisma.zone.delete).not.toHaveBeenCalled()
    })

    it('throws when zone has attached clusters', async () => {
      prisma.cluster.findFirst.mockResolvedValue(mock<Cluster>({ id: 'cluster-1' }))

      await expect(
        service.delete(zone.id, faker.string.uuid(), faker.string.uuid()),
      ).rejects.toThrow('Vous ne pouvez supprimer cette zone')
      expect(prisma.zone.delete).not.toHaveBeenCalled()
    })

    it('throws when zone not found', async () => {
      prisma.cluster.findFirst.mockResolvedValue(null)
      prisma.zone.findUnique.mockResolvedValue(null)

      await expect(
        service.delete(zone.id, faker.string.uuid(), faker.string.uuid()),
      ).rejects.toThrow('Zone non trouvée')
      expect(appEvents.emitZoneEvent).not.toHaveBeenCalled()
    })
  })
})
