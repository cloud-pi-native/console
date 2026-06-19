import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it } from 'vitest'

import { ConfigurationService } from './configuration.service'

describe('configurationService', () => {
  let service: ConfigurationService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ConfigurationService],
    }).compile()

    service = module.get<ConfigurationService>(ConfigurationService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  it('should derive Keycloak issuer and certs URL from configuration', () => {
    expect(service.getKeycloakIssuer()).toBe(
      `${service.keycloakProtocol}://${service.keycloakDomain}/realms/${service.keycloakRealm}`,
    )
    expect(service.getKeycloakCertsUrl()).toBe(
      `${service.getKeycloakIssuer()}/protocol/openid-connect/certs`,
    )
  })

  it('should use public protocol and domain for issuer when set', () => {
    service.keycloakPublicProtocol = 'https'
    service.keycloakPublicDomain = 'keycloak.public.example.fr'
    expect(service.getKeycloakIssuer()).toBe(
      `${service.keycloakPublicProtocol}://${service.keycloakPublicDomain}/realms/${service.keycloakRealm}`,
    )
  })

  it('should fall back to internal protocol and domain when public are not set', () => {
    service.keycloakPublicProtocol = undefined
    service.keycloakPublicDomain = undefined
    expect(service.getKeycloakIssuer()).toBe(
      `${service.keycloakProtocol}://${service.keycloakDomain}/realms/${service.keycloakRealm}`,
    )
  })
})
