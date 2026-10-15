import type { TestingModule } from '@nestjs/testing'
import type { DeepMockProxy } from 'vitest-mock-extended'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import { PrismaService } from '../../infrastructure/database/prisma.service'
import { makeZone } from '../../core/zone/zone-testing.utils'
import { ArgoCDDatastoreService } from './argocd-datastore.service'

function makeZoneWithClusters(labels: string[]) {
  return { ...makeZone(), clusters: labels.map(label => ({ label })) }
}

describe('argoCDDatastoreService', () => {
  let service: ArgoCDDatastoreService
  let prisma: DeepMockProxy<PrismaService>

  beforeEach(async () => {
    prisma = mockDeep<PrismaService>()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ArgoCDDatastoreService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile()

    service = module.get(ArgoCDDatastoreService)
  })

  describe('getZoneClusterNames', () => {
    it('queries the zone by slug', async () => {
      prisma.zone.findUnique.mockResolvedValue(makeZoneWithClusters(['review-cluster']))

      await service.getZoneClusterNames('zone-review')

      expect(prisma.zone.findUnique).toHaveBeenCalledWith({
        where: { slug: 'zone-review' },
        select: { clusters: { select: { label: true } } },
      })
    })

    it('excludes the deleted cluster label', async () => {
      prisma.zone.findUnique.mockResolvedValue(makeZoneWithClusters(['review-cluster', 'other-cluster']))

      await expect(service.getZoneClusterNames('zone-review', 'review-cluster')).resolves.toEqual(['other-cluster'])
    })

    it('returns no names when the zone is unknown', async () => {
      prisma.zone.findUnique.mockResolvedValue(null)

      await expect(service.getZoneClusterNames('missing-zone')).resolves.toEqual([])
    })
  })
})
