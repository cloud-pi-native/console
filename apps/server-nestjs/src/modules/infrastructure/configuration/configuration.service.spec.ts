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
})
