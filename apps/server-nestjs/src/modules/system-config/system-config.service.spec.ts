import type { PrismaService } from '../infrastructure/database/prisma.service'
import { beforeEach, describe, expect, it } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import { SystemConfigService } from './system-config.service'

describe('systemConfigService', () => {
  let prisma: ReturnType<typeof mockDeep<PrismaService>>
  let service: SystemConfigService

  beforeEach(() => {
    prisma = mockDeep<PrismaService>()
    service = new SystemConfigService(prisma)
  })

  it('returns plugin config items', async () => {
    prisma.adminPlugin.findMany.mockResolvedValue([
      { pluginName: 'argocd', key: 'url', value: 'https://argocd' },
    ])

    const result = await service.list()
    expect(result).toBeDefined()
    expect(Array.isArray(result)).toBe(true)
  })

  it('updates plugins config from body via transaction', async () => {
    prisma.$transaction.mockImplementation(async (callback: any) => callback(prisma))
    prisma.adminPlugin.upsert.mockResolvedValue({ pluginName: 'argocd', key: 'url', value: 'https://argocd' })

    await service.update({ argocd: { url: 'https://argocd' } })

    expect(prisma.$transaction).toHaveBeenCalledTimes(1)
  })

  it('does not call upsert for empty body', async () => {
    prisma.$transaction.mockImplementation(async (callback: any) => callback(prisma))

    await service.update({})

    expect(prisma.adminPlugin.upsert).toHaveBeenCalledTimes(0)
  })
})
