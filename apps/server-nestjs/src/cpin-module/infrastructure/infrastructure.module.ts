import { Module } from '@nestjs/common';
import { LoggerService } from './logger/logger.service';
import { DatabaseService } from './database/database.service';
import { HttpClientService } from './http-client/http-client.service';
import { FastifyService } from './fastify/fastify.service';
import { ConfigurationService } from './configuration/configuration.service';

@Module({
  providers: [LoggerService, DatabaseService, HttpClientService, FastifyService, ConfigurationService]
})
export class InfrastructureModule {}
