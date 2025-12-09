import { swaggerUiPath } from '@cpn-console/shared';
import type { FastifySwaggerUiOptions } from '@fastify/swagger-ui';
import { Injectable } from '@nestjs/common';
import type { generateOpenApi } from '@ts-rest/open-api';
import type { FastifyServerOptions } from 'fastify';
import { randomUUID } from 'node:crypto';

import {
    NODE_ENV,
    appVersion,
    keycloakClientId,
    keycloakClientSecret,
    keycloakRealm,
    keycloakRedirectUri,
} from './env';
import { LoggerService } from './logger';

@Injectable()
export class FastifyService {
    constructor(private readonly loggerService: LoggerService) {
        this.fastifyConf = {
            maxParamLength: 5000,
            logger:
                this.loggerService.loggerConf[NODE_ENV] ??
                this.loggerService.loggerConf.production,
            genReqId: () => randomUUID(),
        };
    }

    fastifyConf!: FastifyServerOptions;

    externalDocs = {
        description: 'External documentation.',
        url: 'https://cloud-pi-native.fr',
    };

    swaggerConf: Parameters<typeof generateOpenApi>[1] = {
        info: {
            title: 'Console Cloud Pi Native',
            description: 'API de gestion des ressources Cloud Pi Native.',
            version: appVersion,
        },

        externalDocs: this.externalDocs,
        servers: [
            {
                url: keycloakRedirectUri,
            },
        ],
    };

    swaggerUiConf: FastifySwaggerUiOptions = {
        routePrefix: swaggerUiPath,
        uiConfig: {
            docExpansion: 'list',
            deepLinking: false,
        },
        initOAuth: {
            clientId: keycloakClientId,
            clientSecret: keycloakClientSecret,
            realm: keycloakRealm,
            appName: 'Cloud Pi Native',
            scopes: 'openid generic',
        },
    };
}
