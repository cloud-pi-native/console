import { ConfigurationService } from '@/cpin-module/infrastructure/configuration/configuration.service';
import { apiPrefix, getContract } from '@cpn-console/shared';
import {
    serviceContract,
    swaggerUiPath,
    systemContract,
} from '@cpn-console/shared';
import { tokenHeaderName } from '@cpn-console/shared';
import fastifyCookie from '@fastify/cookie';
import helmet from '@fastify/helmet';
import fastifySession, { FastifySessionOptions } from '@fastify/session';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import { Injectable, Logger } from '@nestjs/common';
import { generateOpenApi } from '@ts-rest/open-api';
import fastify from 'fastify';
import type { FastifyRequest } from 'fastify';
import keycloak, { KeycloakOptions } from 'fastify-keycloak-adapter';

import { FastifyService } from '../fastify/fastify.service';
import { RouterService } from '../router/router.service';

interface KeycloakPayload {
    sub: string;
    email: string;
    given_name: string;
    family_name: string;
    groups: string[];
}

function userPayloadMapper(userPayload: KeycloakPayload) {
    return {
        id: userPayload.sub,
        email: userPayload.email,
        firstName: userPayload.given_name,
        lastName: userPayload.family_name,
        groups: userPayload.groups || [],
    };
}

function bypassFn(request: FastifyRequest) {
    try {
        return !!request.headers[tokenHeaderName];
    } catch (_e) {}
    return false;
}

@Injectable()
export class AppService {
    private readonly loggerService = new Logger(AppService.name);

    constructor(
        private readonly configurationService: ConfigurationService,
        private readonly routerService: RouterService,
        private readonly fastifyService: FastifyService,
    ) {
        this.keycloakConf = {
            appOrigin:
                this.configurationService.keycloakRedirectUri ??
                'http://localhost:8080',
            keycloakSubdomain: `${this.configurationService.keycloakDomain}/realms/${this.configurationService.keycloakRealm}`,
            clientId: this.configurationService.keycloakClientId ?? '',
            clientSecret: this.configurationService.keycloakClientSecret ?? '',
            useHttps: this.configurationService.keycloakProtocol === 'https',
            disableCookiePlugin: true,
            disableSessionPlugin: true,
            // @ts-ignore
            userPayloadMapper,
            retries: 5,
            excludedPatterns: [
                systemContract.getVersion.path,
                systemContract.getHealth.path,
                serviceContract.getServiceHealth.path,
                `${swaggerUiPath}/**`,
            ],
            bypassFn,
        };

        this.sessionConf = {
            cookieName: 'sessionId',
            secret:
                this.configurationService.sessionSecret ||
                'a-very-strong-secret-with-more-than-32-char',
            cookie: {
                httpOnly: true,
                secure: true,
                maxAge: 1_800_000,
            },
        };
    }

    keycloakConf!: KeycloakOptions;
    sessionConf!: FastifySessionOptions;

    async startApp() {
        const openApiDocument = generateOpenApi(
            await getContract(),
            this.fastifyService.swaggerConf,
            { setOperationId: true },
        );

        const app = fastify(this.fastifyService.fastifyConf)
            .register(helmet, () => ({
                contentSecurityPolicy: !(
                    this.configurationService.isInt ||
                    this.configurationService.isDev ||
                    this.configurationService.isTest
                ),
            }))
            .register(fastifyCookie)
            .register(fastifySession, this.sessionConf)
            // @ts-ignore
            .register(keycloak, this.keycloakConf)
            .register(fastifySwagger, {
                transformObject: () => openApiDocument,
            })
            .register(fastifySwaggerUi, this.fastifyService.swaggerUiConf)
            .register(this.routerService.apiRouter())
            .addHook('onRoute', (opts) => {
                if (opts.path === `${apiPrefix}/healthz`) {
                    opts.logLevel = 'silent';
                }
            })
            .setErrorHandler((error: Error, req: { id: string }, reply) => {
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
    }
}
