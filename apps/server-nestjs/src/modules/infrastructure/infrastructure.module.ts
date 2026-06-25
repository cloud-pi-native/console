import { Module } from '@nestjs/common'
import { AuthModule } from './auth/auth.module'
import { ConfigurationModule } from './configuration/configuration.module'
import { DatabaseModule } from './database/database.module'
import { EventsModule } from './events/events.module'
import { LoggerModule } from './logger/logger.module'
import { PermissionModule } from './permission/permission.module'

@Module({
  providers: [],
  imports: [AuthModule, PermissionModule, DatabaseModule, LoggerModule, ConfigurationModule, EventsModule],
  exports: [AuthModule, DatabaseModule, PermissionModule, ConfigurationModule, EventsModule],
})
export class InfrastructureModule {}
