import { Module } from '@nestjs/common'

import { ConfigurationModule } from './configuration/configuration.module'
import { DatabaseModule } from './database/database.module'
import { LoggerModule } from './logger/logger.module'
import { TelemetryModule } from './telemetry/telemetry.module'

@Module({
  providers: [],
  imports: [DatabaseModule, LoggerModule, ConfigurationModule, TelemetryModule],
  exports: [DatabaseModule],
})
export class InfrastructureModule {}
