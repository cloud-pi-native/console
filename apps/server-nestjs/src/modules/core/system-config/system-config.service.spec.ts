import type { ServiceInfos } from '../plugin/plugin.types'
import { DISABLED, ENABLED } from '@cpn-console/shared'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import { PrismaService } from '../../infrastructure/database/prisma.service'
import { PluginService } from '../plugin/plugin.service'
import { SystemConfigService } from './system-config.service'

function makeConfigService(): ServiceInfos {
  return {
    name: 'gitlab',
    title: 'GitLab',
    config: {
      project: [],
      global: [{
        key: 'purge',
        kind: 'switch',
        title: 'Purger',
        initialValue: DISABLED,
        value: DISABLED,
        permissions: {
          admin: { read: true, write: true },
          user: { read: false, write: false },
        },
      }, {
        key: 'readonly',
        kind: 'text',
        title: 'Lecture seule',
        value: 'initial',
        permissions: {
          admin: { read: true, write: false },
          user: { read: false, write: false },
        },
      }, {
        key: 'hidden',
        kind: 'text',
        title: 'Invisible',
        value: 'secret',
        permissions: {
          admin: { read: false, write: false },
          user: { read: false, write: false },
        },
      }],
    },
  }
}

describe('systemConfigService', () => {
  let prisma: ReturnType<typeof mockDeep<PrismaService>>
  let plugins: ReturnType<typeof mockDeep<PluginService>>
  let service: SystemConfigService

  beforeEach(async () => {
    prisma = mockDeep<PrismaService>()
    plugins = mockDeep<PluginService>()
    plugins.manifests.mockReturnValue([makeConfigService()])
    prisma.$transaction.mockImplementation(async callback => callback(prisma))
    const moduleRef = await Test.createTestingModule({
      providers: [
        SystemConfigService,
        { provide: PrismaService, useValue: prisma },
        { provide: PluginService, useValue: plugins },
      ],
    }).compile()
    service = moduleRef.get(SystemConfigService)
  })

  it('lists configured integrations with stored values and readable fields only', async () => {
    prisma.adminPlugin.findMany.mockResolvedValue([
      { pluginName: 'gitlab', key: 'purge', value: ENABLED },
    ])

    expect(await service.list()).toEqual([expect.objectContaining({
      name: 'gitlab',
      title: 'GitLab',
      manifest: [
        expect.objectContaining({ key: 'purge', value: ENABLED }),
        expect.objectContaining({ key: 'readonly', value: 'initial' }),
      ],
    })])
    expect(plugins.infos).not.toHaveBeenCalled()
  })

  it('writes allowed configuration fields without persisting unknown or readonly fields', async () => {
    await service.update({ gitlab: { purge: ENABLED, readonly: 'changed', hidden: 'changed', unknown: 'value' }, absent: { key: 'value' } })

    expect(prisma.adminPlugin.upsert).toHaveBeenCalledExactlyOnceWith({
      create: { pluginName: 'gitlab', key: 'purge', value: ENABLED },
      update: { value: ENABLED },
      where: { pluginName_key: { pluginName: 'gitlab', key: 'purge' } },
    })
    expect(plugins.infos).not.toHaveBeenCalled()
  })

  it('rejects invalid switch values before starting a transaction', async () => {
    await expect(service.update({ gitlab: { purge: 'invalid' } })).rejects.toThrow()
    expect(prisma.$transaction).not.toHaveBeenCalled()
  })

  it('omits integrations without global configuration', async () => {
    plugins.manifests.mockReturnValue([{ name: 'keycloak', title: 'Keycloak' }])
    prisma.adminPlugin.findMany.mockResolvedValue([])
    expect(await service.list()).toEqual([])
  })

  it('does not write records for an empty body', async () => {
    await service.update({})
    expect(prisma.adminPlugin.upsert).not.toHaveBeenCalled()
  })
})
