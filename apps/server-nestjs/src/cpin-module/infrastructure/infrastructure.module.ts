import { Module } from '@nestjs/common'

import { ConfigurationModule } from './configuration/configuration.module'
import { DatabaseModule } from './database/database.module'
import { LoggerModule } from './logger/logger.module'
import { ServerService } from './server/server.service'
import { TelemetryModule } from './telemetry/telemetry.module'

@Module({
  providers: [ServerService],
  imports: [DatabaseModule, LoggerModule, ConfigurationModule, TelemetryModule],
  exports: [DatabaseModule, ServerService],
})
export class InfrastructureModule {}
