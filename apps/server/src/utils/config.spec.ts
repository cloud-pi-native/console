import { beforeEach, describe, expect, it, vi } from 'vitest'
import { systemSettingsDefaultSchema as ConfigDefaultSchema } from '@cpn-console/shared'
import prisma from '../__mocks__/prisma.js'
import { getConfig } from './config.js'

const originalEnv = process.env
const testEnv = {
  maintenance: 'true',
  appName: 'Console Cloud Pi Native du test unitaire ENV',
  contactMail: 'cloudpinative-test-unitaire@testENV.unitaire.gouv.fr',
  appSubTitle: 'Ministère, du test unitaire, et des tests ENV',
}

describe('utils - config', () => {
  beforeEach(() => {
    vi.resetModules()
    globalThis.process.env = originalEnv
  })

  // describe('getEnv', () => {
  //   it('should retieve environment variables', () => {
  //     globalThis.process.env = { ...originalEnv, ...testEnv }

  //     const env = getEnvConfig()

  //     expect(env).toEqual(testEnv)
  //   })
  // })

  describe('getConfig', () => {
    it('should retieve config', async () => {
      prisma.systemSetting.findMany.mockResolvedValue([])
      globalThis.process.env = {}

      const testConfig = await import('./configs/config.valid.spec.json', { assert: { type: 'json' } })
      const env = await getConfig()

      expect(env).toEqual(testConfig.default)
    })

    it('should retieve config override by environment variables', async () => {
      prisma.systemSetting.findMany.mockResolvedValue([])
      globalThis.process.env = { ...originalEnv, ...testEnv }
      const testConfig = await import('./configs/config.valid.spec.json', { assert: { type: 'json' } })

      const env = await getConfig()
      const expected = {
        ...ConfigDefaultSchema.parse({}),
        ...testConfig.default,
        ...testEnv,
      }

      expect(env).toEqual(expected)
    })

    it('should throw an error if config file have an invalid schema', async () => {
      prisma.systemSetting.findMany.mockResolvedValue([])
      globalThis.process.env = {}

      try {
        await getConfig({ fileConfigPath: './configs/config.invalid.spec.json' })
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
        expect(JSON.parse(error?.message).description).toEqual('invalid config file "./configs/config.invalid.spec.json"')
        expect(JSON.parse(error?.message).error.issues[0].message).toEqual('Unrecognized key(s) in object: \'config\'')
      }
    })
  })
})
