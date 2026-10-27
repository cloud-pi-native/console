import type { DeepMockProxy } from 'vitest-mock-extended'
import type { PrismaService } from '../../infrastructure/database/prisma.service'
import { beforeEach, describe, expect, it } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import { ExperimentalFeatureService } from './experimental-feature.service'

const projectId = '11111111-1111-4111-8111-111111111111'
const targetId = '22222222-2222-4222-8222-222222222222'
const actorId = '33333333-3333-4333-8333-333333333333'

function makeTarget() {
  return {
    id: targetId,
    featureKey: 'opencds',
    scopeKind: 'project',
    scopeId: projectId,
    requested: false,
    revision: 0,
    events: [{ revision: 0, action: 'authorize', actorId, createdAt: new Date('2026-01-01T00:00:00Z') }],
  }
}

describe('experimentalFeatureService', () => {
  let prisma: DeepMockProxy<PrismaService>
  let service: ExperimentalFeatureService

  beforeEach(() => {
    prisma = mockDeep<PrismaService>()
    prisma.$transaction.mockImplementation(async (callback) => {
      if (typeof callback !== 'function') throw new Error('Expected a transaction callback')
      return callback(prisma)
    })
    service = new ExperimentalFeatureService(prisma)
  })

  it('refuses to authorize an unknown project', async () => {
    prisma.project.count.mockResolvedValue(0)
    await expect(service.authorize({ kind: 'project', id: projectId }, actorId)).rejects.toThrow(projectId)
    expect(prisma.experimentalFeatureTarget.upsert).not.toHaveBeenCalled()
  })

  it('records who authorized an existing project', async () => {
    prisma.project.count.mockResolvedValue(1)
    prisma.experimentalFeatureTarget.upsert.mockResolvedValue({ ...makeTarget() })
    await service.authorize({ kind: 'project', id: projectId }, actorId)
    expect(prisma.experimentalFeatureTarget.upsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({
        scopeKind: 'project',
        scopeId: projectId,
        events: { create: { revision: 0, action: 'authorize', actorId } },
      }),
    }))
  })

  it('refuses activation without an authorized target', async () => {
    prisma.experimentalFeatureTarget.findUnique.mockResolvedValue(null)
    await expect(service.request(targetId, { requested: true, expectedRevision: 0 }, actorId))
      .rejects.toThrow(targetId)
    expect(prisma.experimentalFeatureTarget.updateMany).not.toHaveBeenCalled()
  })

  it('refuses an obsolete revision without writing history', async () => {
    prisma.experimentalFeatureTarget.findUnique.mockResolvedValue(makeTarget())
    await expect(service.request(targetId, { requested: true, expectedRevision: 5 }, actorId))
      .rejects.toThrow('révision')
    expect(prisma.experimentalFeatureEvent.create).not.toHaveBeenCalled()
  })

  it('refuses a concurrent modification even if the initial revision matched', async () => {
    prisma.experimentalFeatureTarget.findUnique.mockResolvedValue(makeTarget())
    prisma.project.count.mockResolvedValue(1)
    prisma.experimentalFeatureTarget.updateMany.mockResolvedValue({ count: 0 })
    await expect(service.request(targetId, { requested: true, expectedRevision: 0 }, actorId))
      .rejects.toThrow('révision')
    expect(prisma.experimentalFeatureEvent.create).not.toHaveBeenCalled()
  })

  it('records an activation request without claiming application', async () => {
    const target = makeTarget()
    prisma.experimentalFeatureTarget.findUnique.mockResolvedValue(target)
    prisma.project.count.mockResolvedValue(1)
    prisma.experimentalFeatureTarget.updateMany.mockResolvedValue({ count: 1 })
    prisma.experimentalFeatureTarget.findUniqueOrThrow.mockResolvedValue({ ...target, requested: true, revision: 1 })
    const result = await service.request(targetId, { requested: true, expectedRevision: 0 }, actorId)
    expect(result.requested).toBe(true)
    expect(prisma.experimentalFeatureEvent.create).toHaveBeenCalledWith({
      data: { targetId, revision: 1, action: 'activate', actorId },
    })
    expect(prisma.experimentalFeatureTarget.updateMany).toHaveBeenCalledWith({
      where: { id: targetId, revision: 0 },
      data: { requested: true, revision: { increment: 1 } },
    })
  })

  it('allows suspension even if the resource has since disappeared', async () => {
    prisma.experimentalFeatureTarget.findUnique.mockResolvedValue({ ...makeTarget(), requested: true })
    prisma.experimentalFeatureTarget.updateMany.mockResolvedValue({ count: 1 })
    prisma.experimentalFeatureTarget.findUniqueOrThrow.mockResolvedValue({ ...makeTarget(), revision: 1 })
    await service.request(targetId, { requested: false, expectedRevision: 0 }, actorId)
    expect(prisma.project.count).not.toHaveBeenCalled()
    expect(prisma.experimentalFeatureEvent.create).toHaveBeenCalledWith({
      data: { targetId, revision: 1, action: 'suspend', actorId },
    })
  })
})
