import { Module } from '@nestjs/common'
import { AuthModule } from './auth/auth.module'
import { ConfigurationModule } from './configuration/configuration.module'
import { DatabaseModule } from './database/database.module'
import { EventsModule } from './events/events.module'
import { LoggerModule } from './logger/logger.module'
import { PermissionModule } from './permission/permission.module'

@Module({
  providers: [],
  imports: [AuthModule, DatabaseModule, ConfigurationModule, EventsModule, LoggerModule, PermissionModule],
  exports: [AuthModule, DatabaseModule, ConfigurationModule, EventsModule, LoggerModule, PermissionModule],
})
export class InfrastructureModule {}
