import { Test, type TestingModule } from '@nestjs/testing'
import { VaultService } from './vault.service'
import { ConfigurationService } from '@/cpin-module/infrastructure/configuration/configuration.service'
import { vi, describe, beforeEach, it, expect, type Mock } from 'vitest'

describe('VaultService', () => {
  let service: VaultService
  let fetchMock: Mock

  const mockConfigService = {
    vaultToken: 'token',
    vaultUrl: 'http://vault',
    vaultInternalUrl: 'http://vault-internal',
    vaultKvName: 'kv',
  }

  beforeEach(async () => {
    vi.clearAllMocks()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VaultService,
        {
          provide: ConfigurationService,
          useValue: mockConfigService,
        },
      ],
    }).compile()

    service = module.get<VaultService>(VaultService)

    // Mock global fetch
    fetchMock = vi.fn()
    global.fetch = fetchMock
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('read', () => {
    it('should read secret', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ data: { data: { secret: 'value' } } }),
      })

      const result = await service.read('path')
      expect(result).toEqual({ secret: 'value' })
      expect(fetchMock).toHaveBeenCalledWith(
        'http://vault-internal/v1/kv/data/path',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({ 'X-Vault-Token': 'token' }),
        })
      )
    })

    it('should return undefined if 404', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 404,
      })

      const result = await service.read('path')
      expect(result).toBeUndefined()
    })
  })

  describe('write', () => {
    it('should write secret', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({}),
      })

      await service.write({ secret: 'value' }, 'path')
      expect(fetchMock).toHaveBeenCalledWith(
        'http://vault-internal/v1/kv/data/path',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ data: { secret: 'value' } }),
        })
      )
    })
  })

  describe('destroy', () => {
    it('should destroy secret', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        status: 204,
      })

      await service.destroy('path')
      expect(fetchMock).toHaveBeenCalledWith(
        'http://vault-internal/v1/kv/metadata/path',
        expect.objectContaining({
          method: 'DELETE',
        })
      )
    })
  })
})
