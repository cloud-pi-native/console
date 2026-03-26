import type { TestingModule } from '@nestjs/testing'
import type { Mock } from 'vitest'
import { CACHE_MANAGER } from '@nestjs/cache-manager'
import { JwtService } from '@nestjs/jwt'
import { Test } from '@nestjs/testing'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ConfigurationService } from '../configuration/configuration.service'
import { AuthService } from './auth.service'

vi.mock('node:crypto', async (importOriginal) => {
  const mod = await importOriginal<typeof import('node:crypto')>()
  return {
    ...mod,
    createPublicKey: vi.fn().mockReturnValue({
      export: vi.fn().mockReturnValue('mocked-pem'),
    }),
  }
})

describe('authService', () => {
  let service: AuthService
  let cacheManager: { get: Mock, set: Mock }
  let jwtService: { decode: Mock, verifyAsync: Mock }
  let configService: { keycloakClientId: string }

  const mockJwks = {
    keys: [
      {
        kty: 'RSA',
        kid: 'test-kid',
        use: 'sig',
        n: 'test-n-base64', // normally a valid base64url string, but z.string() just checks if it's a string
        e: 'AQAB',
      },
    ],
  }

  const mockJwt = {
    header: { kid: 'test-kid' },
    payload: { iss: 'http://test-issuer' },
  }

  const mockPayload = {
    sub: 'user-id',
    iss: 'http://test-issuer',
    aud: 'test-client',
  }

  beforeEach(async () => {
    cacheManager = { get: vi.fn(), set: vi.fn() }
    jwtService = { decode: vi.fn(), verifyAsync: vi.fn() }
    configService = { keycloakClientId: 'test-client' }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: CACHE_MANAGER, useValue: cacheManager },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigurationService, useValue: configService },
      ],
    }).compile()

    service = module.get<AuthService>(AuthService)

    // Mock global fetch
    globalThis.fetch = vi.fn()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('verifyToken', () => {
    it('should return null if token decode fails', async () => {
      jwtService.decode.mockReturnValue(null)
      const result = await service.verifyToken('invalid-token')
      expect(result).toBeNull()
    })

    it('should return null if kid is missing in jwks', async () => {
      jwtService.decode.mockReturnValue(mockJwt)
      cacheManager.get.mockResolvedValue({ keys: [] })

      const result = await service.verifyToken('valid-token')
      expect(result).toBeNull()
    })

    it('should fetch JWKS and cache it if not in cache', async () => {
      jwtService.decode.mockReturnValue(mockJwt)
      cacheManager.get.mockResolvedValue(null)
      ;(globalThis.fetch as Mock).mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(mockJwks),
        headers: { get: vi.fn().mockReturnValue('max-age=3600') },
      })
      jwtService.verifyAsync.mockResolvedValue(mockPayload)

      const result = await service.verifyToken('valid-token')

      expect(globalThis.fetch).toHaveBeenCalledWith('http://test-issuer/protocol/openid-connect/certs', expect.any(Object))
      expect(cacheManager.set).toHaveBeenCalledWith('jwks:http://test-issuer', mockJwks, 3600000)
      expect(jwtService.verifyAsync).toHaveBeenCalledWith('valid-token', {
        publicKey: 'mocked-pem',
        issuer: 'http://test-issuer',
        audience: 'test-client',
        algorithms: ['RS256'],
      })
      expect(result).toEqual(mockPayload)
    })

    it('should return null if verifyAsync throws', async () => {
      jwtService.decode.mockReturnValue(mockJwt)
      cacheManager.get.mockResolvedValue(mockJwks)
      jwtService.verifyAsync.mockRejectedValue(new Error('verify failed'))

      const result = await service.verifyToken('valid-token')
      expect(result).toBeNull()
    })

    it('should return null if verified payload fails zod schema', async () => {
      jwtService.decode.mockReturnValue(mockJwt)
      cacheManager.get.mockResolvedValue(mockJwks)
      jwtService.verifyAsync.mockResolvedValue({ invalid: 'payload', sub: 123 }) // sub should be string

      const result = await service.verifyToken('valid-token')
      expect(result).toBeNull()
    })
  })
})
