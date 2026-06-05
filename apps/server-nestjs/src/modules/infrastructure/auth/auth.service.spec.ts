import type { TestingModule } from '@nestjs/testing'
import type { DeepMockProxy } from 'vitest-mock-extended'
import { UnauthorizedException } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import { AuthService } from './auth.service'
import { DsoTokenService } from './dso-token/dso-token.service'
import { KeycloakJwtService } from './keycloak-jwt/keycloak-jwt.service'

describe('authService', () => {
  let module: TestingModule
  let service: AuthService
  let dsoTokenService: DeepMockProxy<DsoTokenService>
  let keycloakJwtService: DeepMockProxy<KeycloakJwtService>

  beforeEach(async () => {
    dsoTokenService = mockDeep<DsoTokenService>()
    keycloakJwtService = mockDeep<KeycloakJwtService>()

    module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: DsoTokenService, useValue: dsoTokenService },
        { provide: KeycloakJwtService, useValue: keycloakJwtService },
      ],
    }).compile()

    service = module.get<AuthService>(AuthService)
  })

  it('should authenticate a Fastify request directly', async () => {
    dsoTokenService.authenticate.mockResolvedValue({ userId: 'u1', adminPermissions: 0n, userType: 'human' })
    const request = { headers: { 'x-dso-token': 'token' } } as Parameters<AuthService['authenticate']>[0]

    const result = await service.authenticate(request)

    expect(result).toEqual({ userId: 'u1', adminPermissions: 0n, userType: 'human' })
    expect(dsoTokenService.authenticate).toHaveBeenCalledWith(request, undefined)
  })

  it('should authenticate a Keycloak bearer token from the request header', async () => {
    keycloakJwtService.authenticate.mockResolvedValue({ userId: 'u1', adminPermissions: 8n, userType: 'human' })

    const request = { headers: { authorization: 'Bearer jwt-token' } } as Parameters<AuthService['authenticate']>[0]
    const result = await service.authenticate(request)

    expect(keycloakJwtService.authenticate).toHaveBeenCalledWith(
      request,
      undefined,
    )
    expect(result).toEqual({ userId: 'u1', adminPermissions: 8n, userType: 'human' })
  })

  it('should throw 401 when no supported auth header exists', async () => {
    await expect(service.authenticate({ headers: {} } as Parameters<AuthService['authenticate']>[0])).rejects.toThrow(UnauthorizedException)
  })
})
