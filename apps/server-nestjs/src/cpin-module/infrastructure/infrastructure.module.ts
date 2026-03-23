import { Module } from '@nestjs/common'

import { ConfigurationModule } from './configuration/configuration.module'
import { DatabaseModule } from './database/database.module'
import { HttpClientService } from './http-client/http-client.service'
import { LoggerModule } from './logger/logger.module'
import { ServerService } from './server/server.service'
import { TelemetryModule } from './telemetry/telemetry.module'

@Module({
  providers: [HttpClientService, ServerService],
  imports: [DatabaseModule, LoggerModule, ConfigurationModule, TelemetryModule],
  exports: [DatabaseModule, HttpClientService, ServerService],
})
export class InfrastructureModule {}
