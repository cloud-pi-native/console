import { apiPrefix, getContract } from '@cpn-console/shared';
import fastifyCookie from '@fastify/cookie';
import helmet from '@fastify/helmet';
import fastifySession from '@fastify/session';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import { Injectable } from '@nestjs/common';
import { initServer } from '@ts-rest/fastify';
import { generateOpenApi } from '@ts-rest/open-api';
import type { FastifyRequest } from 'fastify';
import fastify from 'fastify';
import keycloak from 'fastify-keycloak-adapter';

import { AppService } from './app';
import { ConnectionService } from './connect';
import { PrepareAppService } from './prepare-app';
import { ResourcesService } from './resources/index';
import {
    isCI,
    isDev,
    isDevSetup,
    isInt,
    isProd,
    isTest,
    port,
} from './utils/env';
import { FastifyService } from './utils/fastify';
import { keycloakConf, sessionConf } from './utils/keycloak';
import type { CustomLogger } from './utils/logger';
import { LoggerService } from './utils/logger';

@Injectable()
export class ServerService {
    constructor(
        private readonly appService: AppService,
        private readonly connectionService: ConnectionService,
        private readonly fastifyService: FastifyService,
        private readonly loggerService: LoggerService,
        private readonly prepareAppService: PrepareAppService,
        private readonly resourceService: ResourcesService,
    ) {}

    app: any;
    serverInstance: ReturnType<typeof initServer> = initServer();
    logger: any;

    handleExit() {
        process.on('exit', this.logExitCode);
        process.on('SIGINT', this.exitGracefully);
        process.on('SIGTERM', this.exitGracefully);
        process.on('uncaughtException', this.exitGracefully);
        process.on('unhandledRejection', this.logUnhandledRejection);
    }

    logExitCode(code: number) {
        this.appService.logger.warn(`received signal: ${code}`);
    }

    logUnhandledRejection(reason: unknown, promise: Promise<unknown>) {
        this.appService.logger.error({
            message: 'Unhandled Rejection',
            promise,
            reason,
        });
    }

    async exitGracefully(error?: Error) {
        if (error instanceof Error) {
            this.appService.logger.fatal(error);
        }
        await this.app.close();
        this.appService.logger.info('Closing connections...');
        await this.connectionService.closeConnections();
        this.appService.logger.info('Exiting...');
        process.exit(error instanceof Error ? 1 : 0);
    }

    async getApp(): Promise<void> {
        const app = await this.prepareAppService.getPreparedApp();

        try {
            await app.listen({ host: '0.0.0.0', port: +(port ?? 8080) });
        } catch (error) {
            this.appService.logger.error(error);
            process.exit(1);
        }

        this.appService.logger.debug({
            isDev,
            isTest,
            isCI,
            isDevSetup,
            isProd,
        });
        this.handleExit();
    }

    async createApp() {
        const openApiDocument = generateOpenApi(
            await getContract(),
            this.fastifyService.swaggerConf,
            {
                setOperationId: true,
            },
        );

        const app = fastify(this.fastifyService.fastifyConf)
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
            .register(fastifySwaggerUi, this.fastifyService.swaggerConf as any)
            .register(this.resourceService.apiRouter())
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

        await app.ready();

        this.logger = app.log as CustomLogger;
    }
}
