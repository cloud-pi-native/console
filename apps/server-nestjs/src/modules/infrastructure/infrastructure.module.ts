import { Module } from '@nestjs/common'
import { AuthModule } from './auth/auth.module.js'
import { ConfigurationModule } from './configuration/configuration.module'
import { DatabaseModule } from './database/database.module'
import { LoggerModule } from './logger/logger.module'

@Module({
  providers: [],
  imports: [AuthModule, DatabaseModule, LoggerModule, ConfigurationModule],
  exports: [DatabaseModule],
})
export class InfrastructureModule {}
