import { apiPrefix, getContract } from '@cpn-console/shared';
import fastifyCookie from '@fastify/cookie';
import helmet from '@fastify/helmet';
import fastifySession from '@fastify/session';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import { Injectable } from '@nestjs/common';
import { logger } from '@old-server/app';
import { ConnectionService } from '@old-server/connect';
import { getPreparedApp } from '@old-server/prepare-app';
import { apiRouter } from '@old-server/resources/index.js';
import {
    isCI,
    isDev,
    isDevSetup,
    isInt,
    isProd,
    isTest,
    port,
} from '@old-server/utils/env.js';
import {
    fastifyConf,
    swaggerConf,
    swaggerUiConf,
} from '@old-server/utils/fastify.js';
import { keycloakConf, sessionConf } from '@old-server/utils/keycloak.js';
import type { CustomLogger } from '@old-server/utils/logger.js';
import { log } from '@old-server/utils/logger.js';
import { initServer } from '@ts-rest/fastify';
import { generateOpenApi } from '@ts-rest/open-api';
import type { FastifyRequest } from 'fastify';
import fastify from 'fastify';
import keycloak from 'fastify-keycloak-adapter';

@Injectable()
export class CpinService {
    constructor(private readonly connectionService: ConnectionService) {}

    app: any;
    serverInstance: ReturnType<typeof initServer> = initServer();
    logger: CustomLogger;

    handleExit() {
        process.on('exit', this.logExitCode);
        process.on('SIGINT', this.exitGracefully);
        process.on('SIGTERM', this.exitGracefully);
        process.on('uncaughtException', this.exitGracefully);
        process.on('unhandledRejection', this.logUnhandledRejection);
    }

    logExitCode(code: number) {
        logger.warn(`received signal: ${code}`);
    }

    logUnhandledRejection(reason: unknown, promise: Promise<unknown>) {
        logger.error({ message: 'Unhandled Rejection', promise, reason });
    }

    async exitGracefully(error?: Error) {
        if (error instanceof Error) {
            logger.fatal(error);
        }
        await this.app.close();
        logger.info('Closing connections...');
        await this.connectionService.closeConnections();
        logger.info('Exiting...');
        process.exit(error instanceof Error ? 1 : 0);
    }

    async getApp(): Promise<void> {
        const app = await getPreparedApp();

        try {
            await app.listen({ host: '0.0.0.0', port: +(port ?? 8080) });
        } catch (error) {
            logger.error(error);
            process.exit(1);
        }

        logger.debug({ isDev, isTest, isCI, isDevSetup, isProd });
        this.handleExit();
    }

    async createApp() {
        const openApiDocument = generateOpenApi(
            await getContract(),
            swaggerConf,
            {
                setOperationId: true,
            },
        );

        const app = fastify(fastifyConf)
            .register(helmet, () => ({
                contentSecurityPolicy: !(isInt || isDev || isTest),
            }))
            .register(fastifyCookie)
            .register(fastifySession, sessionConf)
            // @ts-ignore
            .register(keycloak, keycloakConf)
            .register(fastifySwagger, {
                transformObject: () => openApiDocument,
            })
            .register(fastifySwaggerUi, swaggerUiConf)
            .register(apiRouter())
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
                log('info', { reqId: req.id, error });
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

        await app.ready();

        this.logger = app.log as CustomLogger;
    }
}
