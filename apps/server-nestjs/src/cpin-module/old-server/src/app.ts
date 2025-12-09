import { apiPrefix, getContract } from '@cpn-console/shared';
import fastifyCookie from '@fastify/cookie';
import helmet from '@fastify/helmet';
import fastifySession from '@fastify/session';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import { Injectable } from '@nestjs/common';
import { initServer } from '@ts-rest/fastify';
import { generateOpenApi } from '@ts-rest/open-api';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import fastify from 'fastify';
import keycloak from 'fastify-keycloak-adapter';

import { ResourcesService } from './resources/index';
import { isDev, isInt, isTest } from './utils/env';
import { FastifyService } from './utils/fastify';
import { keycloakConf, sessionConf } from './utils/keycloak';
import type { CustomLogger } from './utils/logger';
import { LoggerService } from './utils/logger';

@Injectable()
export class AppService {
    constructor(
        private readonly loggerService: LoggerService,
        private readonly fastifyService: FastifyService,
        private readonly resourcesService: ResourcesService,
    ) {}

    serverInstance: ReturnType<typeof initServer> = initServer();

    app: FastifyInstance;
    logger: any;

    async init() {
        const contract = await getContract();
        this.app = fastify(this.fastifyService.fastifyConf)
            .register(helmet, () => ({
                contentSecurityPolicy: !(isInt || isDev || isTest),
            }))
            .register(fastifyCookie)
            .register(fastifySession, sessionConf)
            // @ts-ignore
            .register(keycloak, keycloakConf)
            .register(fastifySwagger, {
                transformObject: () =>
                    generateOpenApi(contract, this.fastifyService.swaggerConf, {
                        setOperationId: true,
                    }),
            })
            .register(fastifySwaggerUi, this.fastifyService.swaggerUiConf)
            .register(this.resourcesService.apiRouter())
            .addHook('onRoute', (opts) => {
                if (opts.path === `${apiPrefix}/healthz`) {
                    opts.logLevel = 'silent';
                }
            })
            .setErrorHandler((error: Error, req: FastifyRequest, reply) => {
                const statusCode = 500;
                // @ts-ignore vérifier l'objet
                const message = error.description || error.message;
                reply.status(statusCode).send({
                    status: statusCode,
                    error: message,
                    stack: error.stack,
                });
                this.loggerService.log('info', { reqId: req.id, error });
            })
            .addHook('onResponse', (req, res) => {
                if (res.statusCode < 400) {
                    req.log.info({
                        status: res.statusCode,
                        userId: req.session?.user?.id,
                    });
                } else if (res.statusCode < 500) {
                    req.log.warn({
                        status: res.statusCode,
                        userId: req.session?.user?.id,
                    });
                } else {
                    req.log.error({
                        status: res.statusCode,
                        userId: req.session?.user?.id,
                    });
                }
            });
        this.logger = this.app.log as CustomLogger;

        await this.app.ready();
    }
}
