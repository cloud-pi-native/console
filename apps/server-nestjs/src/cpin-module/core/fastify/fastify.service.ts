import type { FastifySwaggerUiOptions } from '@fastify/swagger-ui'
import type { generateOpenApi } from '@ts-rest/open-api'
import type { FastifyServerOptions } from 'fastify'
import { randomUUID } from 'node:crypto'
import { getLoggerOptions } from '@cpn-console/logger'
import { swaggerUiPath } from '@cpn-console/shared'
import { Inject, Injectable } from '@nestjs/common'
import { ConfigurationService } from '../../infrastructure/configuration/configuration.service'

@Injectable()
export class FastifyService {
  constructor(
    @Inject(ConfigurationService) private readonly configurationService: ConfigurationService,
  ) {
    this.fastifyConf = {
      maxParamLength: 5000,
      logger: getLoggerOptions(this.configurationService.isProd ? 'production' : 'development', this.configurationService.isTest ? 'info' : 'debug'),
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
