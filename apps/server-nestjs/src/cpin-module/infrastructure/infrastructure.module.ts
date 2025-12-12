import { Module } from '@nestjs/common';

import { ConfigurationModule } from './configuration/configuration.module';
import { DatabaseService } from './database/database.service';
import { FastifyService } from './fastify/fastify.service';
import { HttpClientService } from './http-client/http-client.service';
import { LoggerModule } from './logger/logger.module';

@Module({
    providers: [DatabaseService, HttpClientService, FastifyService],
    imports: [LoggerModule, ConfigurationModule],
})
export class InfrastructureModule {}
