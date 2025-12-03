import { swaggerUiPath } from '@cpn-console/shared';
import type { FastifySwaggerUiOptions } from '@fastify/swagger-ui';
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
} from './env.js';
import { loggerConf } from './logger.js';

export const fastifyConf: FastifyServerOptions = {
    maxParamLength: 5000,
    logger: loggerConf[NODE_ENV] ?? loggerConf.production,
    genReqId: () => randomUUID(),
};

const externalDocs = {
    description: 'External documentation.',
    url: 'https://cloud-pi-native.fr',
};

export const swaggerConf: Parameters<typeof generateOpenApi>[1] = {
    info: {
        title: 'Console Cloud Pi Native',
        description: 'API de gestion des ressources Cloud Pi Native.',
        version: appVersion,
    },

    externalDocs,
    servers: [
        {
            url: keycloakRedirectUri,
        },
    ],
};

export const swaggerUiConf: FastifySwaggerUiOptions = {
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
