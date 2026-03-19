import { Module } from '@nestjs/common'

import { ConfigurationModule } from './configuration/configuration.module'
import { DatabaseService } from './database/database.service'
import { PrismaService } from './database/prisma.service'
import { HealthModule } from './health/health.module'
import { HttpClientService } from './http-client/http-client.service'
import { LoggerModule } from './logger/logger.module'
import { ServerService } from './server/server.service'
import { TelemetryModule } from './telemetry/telemetry.module'

@Module({
  providers: [DatabaseService, PrismaService, HttpClientService, ServerService],
  imports: [LoggerModule, ConfigurationModule, TelemetryModule, HealthModule],
  exports: [DatabaseService, PrismaService, HttpClientService, ServerService],
})
export class InfrastructureModule {}
