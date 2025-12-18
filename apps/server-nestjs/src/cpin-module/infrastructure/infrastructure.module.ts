import { Module } from '@nestjs/common';

import { ConfigurationModule } from './configuration/configuration.module';
import { DatabaseService } from './database/database.service';
import { FastifyService } from './fastify/fastify.service';
import { HttpClientService } from './http-client/http-client.service';
import { LoggerModule } from './logger/logger.module';
import { ServerService } from './server/server.service';

@Module({
    providers: [
        DatabaseService,
        HttpClientService,
        FastifyService,
        ServerService,
    ],
    imports: [LoggerModule, ConfigurationModule],
    exports: [
        DatabaseService,
        HttpClientService,
        FastifyService,
        ServerService,
    ],
})
export class InfrastructureModule {}
