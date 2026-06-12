import { beforeEach, describe, expect, it } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import type { PrismaService } from '../infrastructure/database/prisma.service'
import { SystemConfigService } from './system-config.service'

describe('SystemConfigService', () => {
  let prisma: ReturnType<typeof mockDeep<PrismaService>>
  let service: SystemConfigService

  beforeEach(() => {
    prisma = mockDeep<PrismaService>()
    service = new SystemConfigService(prisma)
  })

  it('returns plugin config items', async () => {
    prisma.adminPlugin.findMany.mockResolvedValue([
      { pluginName: 'argocd', key: 'url', value: 'https://argocd' },
      { pluginName: 'gitlab', key: 'url', value: 'https://gitlab' },
    ])

    await expect(service.listPluginsConfig()).resolves.toEqual([
      expect.objectContaining({ pluginName: 'argocd', key: 'url', value: 'https://argocd' }),
      expect.objectContaining({ pluginName: 'gitlab', key: 'url', value: 'https://gitlab' }),
    ])
  })
})
