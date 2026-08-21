import type { Cluster, Prisma } from '@prisma/client'
import type { DeepMockProxy } from 'vitest-mock-extended'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import { faker } from '@faker-js/faker'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { PrismaService } from '../infrastructure/database/prisma.service'
import { LogService } from '../log/log.service'
import { makeZone } from './zone-testing.utils'
import { ZoneService } from './zone.service'

describe('ZoneService', () => {
  let service: ZoneService
  let prisma: DeepMockProxy<PrismaService>
  let logs: DeepMockProxy<LogService>
  let events: DeepMockProxy<EventEmitter2>

  beforeEach(async () => {
    prisma = mockDeep<PrismaService>()
    logs = mockDeep<LogService>()
    events = mockDeep<EventEmitter2>()

    const moduleRef = await Test.createTestingModule({
      providers: [
        ZoneService,
        { provide: PrismaService, useValue: prisma },
        { provide: LogService, useValue: logs },
        { provide: EventEmitter2, useValue: events },
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
    let zone: ReturnType<typeof makeZone>

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
      expect(logs.addLog).toHaveBeenCalledWith(expect.objectContaining({ action: 'Create zone' }))
      expect(events.emitAsync).toHaveBeenCalledWith('zone.upsert', zone)
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
      expect(events.emitAsync).toHaveBeenCalledWith('zone.upsert', zone)
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
  })

  describe('update', () => {
    let zone: ReturnType<typeof makeZone>

    beforeEach(() => {
      zone = makeZone()
    })

    it('updates a zone within a transaction', async () => {
      prisma.zone.findUnique.mockResolvedValue(zone)
      const tx = mockDeep<Prisma.TransactionClient>()
      tx.zone.update.mockResolvedValue(zone)
      prisma.$transaction.mockImplementation(async cb => cb(tx))

      const result = await service.update(
        zone.id,
        { label: 'new label', argocdUrl: zone.argocdUrl, description: zone.description },
        faker.string.uuid(),
        faker.string.uuid(),
      )

      expect(result).toEqual(zone)
      expect(tx.zone.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: zone.id },
        data: expect.objectContaining({ label: 'new label' }),
      }))
      expect(logs.addLog).toHaveBeenCalledWith(expect.objectContaining({ action: 'Update zone' }))
      expect(events.emitAsync).toHaveBeenCalledWith('zone.upsert', zone)
    })

    it('throws when zone not found', async () => {
      prisma.zone.findUnique.mockResolvedValue(null)

      await expect(
        service.update(zone.id, { label: 'new label', argocdUrl: zone.argocdUrl }, faker.string.uuid(), faker.string.uuid()),
      ).rejects.toThrow('Zone non trouvée')
    })
  })

  describe('delete', () => {
    let zone: ReturnType<typeof makeZone>

    beforeEach(() => {
      zone = makeZone()
    })

    it('deletes a zone when no clusters are attached', async () => {
      prisma.cluster.findFirst.mockResolvedValue(null)
      const tx = mockDeep<Prisma.TransactionClient>()
      tx.zone.delete.mockResolvedValue(zone)
      prisma.$transaction.mockImplementation(async cb => cb(tx))

      await service.delete(zone.id, faker.string.uuid(), faker.string.uuid())

      expect(tx.zone.delete).toHaveBeenCalledWith({ where: { id: zone.id } })
      expect(logs.addLog).toHaveBeenCalledWith(expect.objectContaining({ action: 'Delete zone' }))
      expect(events.emitAsync).toHaveBeenCalledWith('zone.delete', zone)
    })

    it('throws when zone has attached clusters', async () => {
      prisma.cluster.findFirst.mockResolvedValue({ id: 'cluster-1' } as unknown as Cluster)

      await expect(
        service.delete(zone.id, faker.string.uuid(), faker.string.uuid()),
      ).rejects.toThrow('Vous ne pouvez supprimer cette zone')
      expect(prisma.zone.delete).not.toHaveBeenCalled()
    })
  })
})
