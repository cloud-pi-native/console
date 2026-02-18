import type { ConfigurationService } from '@/cpin-module/infrastructure/configuration/configuration.service'
import { loggerConfiguration } from '@/cpin-module/infrastructure/logger/logger.module'
import { swaggerUiPath } from '@cpn-console/shared'
import type { FastifySwaggerUiOptions } from '@fastify/swagger-ui'
import { Injectable } from '@nestjs/common'
import type { generateOpenApi } from '@ts-rest/open-api'
import type { FastifyServerOptions } from 'fastify'
import { randomUUID } from 'node:crypto'

@Injectable()
export class FastifyService {
  constructor(private readonly configurationService: ConfigurationService) {
    this.fastifyConf = {
      maxParamLength: 5000,
      logger:
                loggerConfiguration[this.configurationService.NODE_ENV]
                ?? loggerConfiguration.production,
      genReqId: () => randomUUID(),
    }

    this.swaggerConf = {
      info: {
        title: 'Console Cloud Pi Native',
        description: 'API de gestion des ressources Cloud Pi Native.',
        version: this.configurationService.appVersion,
      },

      externalDocs: this.externalDocs,
      servers: [
        {
          url: this.configurationService.keycloakRedirectUri,
        },
      ],
    }

    this.swaggerUiConf = {
      routePrefix: swaggerUiPath,
      uiConfig: {
        docExpansion: 'list',
        deepLinking: false,
      },
      initOAuth: {
        clientId: this.configurationService.keycloakClientId,
        clientSecret: this.configurationService.keycloakClientSecret,
        realm: this.configurationService.keycloakRealm,
        appName: 'Cloud Pi Native',
        scopes: 'openid generic',
      },
    }
  }

  fastifyConf!: FastifyServerOptions

  externalDocs = {
    description: 'External documentation.',
    url: 'https://cloud-pi-native.fr',
  }

  swaggerConf: Parameters<typeof generateOpenApi>[1]

  swaggerUiConf: FastifySwaggerUiOptions
}
