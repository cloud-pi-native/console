import type { Cluster, Prisma } from '@prisma/client'
import type { DeepMockProxy } from 'vitest-mock-extended'
import { faker } from '@faker-js/faker'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import { PrismaService } from '../infrastructure/database/prisma.service'
import { LogService } from '../log/log.service'
import { makeZone } from './zone-testing.utils'
import { ZoneService } from './zone.service'

describe('zoneService', () => {
  let service: ZoneService
  let prisma: DeepMockProxy<PrismaService>
  let logs: DeepMockProxy<LogService>
  let events: DeepMockProxy<EventEmitter2>

  beforeEach(async () => {
    prisma = mockDeep<PrismaService>()
    logs = mockDeep<LogService>()
    events = mockDeep<EventEmitter2>()
    events.emitAsync.mockResolvedValue([])

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

    it('rejects with 422 and logs the listener result when a plugin fails', async () => {
      prisma.zone.findUnique.mockResolvedValue(null)
      const tx = mockDeep<Prisma.TransactionClient>()
      tx.zone.create.mockResolvedValue(zone)
      prisma.$transaction.mockImplementation(async cb => cb(tx))
      events.emitAsync.mockResolvedValue([
        { vault: { status: 'KO', message: 'Vault unreachable', executionTime: 1, error: new Error('boom') } },
      ])

      await expect(
        service.create({ slug: zone.slug, label: zone.label, argocdUrl: zone.argocdUrl }, faker.string.uuid(), faker.string.uuid()),
      ).rejects.toThrow('Echec des services lors de la création de la zone')

      expect(logs.addLog).toHaveBeenCalledWith(expect.objectContaining({
        action: 'Create zone',
        data: expect.objectContaining({ vault: expect.objectContaining({ status: 'KO' }) }),
      }))
    })
  })

  describe('update', () => {
    let zone: ReturnType<typeof makeZone>

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
      expect(prisma.zone.update).toHaveBeenCalledWith(expect.objectContaining({
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
      prisma.zone.delete.mockResolvedValue(zone)

      await service.delete(zone.id, faker.string.uuid(), faker.string.uuid())

      expect(prisma.zone.delete).toHaveBeenCalledWith({ where: { id: zone.id } })
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
