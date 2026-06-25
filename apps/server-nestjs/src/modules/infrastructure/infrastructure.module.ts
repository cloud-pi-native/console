import { Module } from '@nestjs/common'
import { EventEmitterModule } from '@nestjs/event-emitter'
import { AuthModule } from './auth/auth.module.js'
import { ConfigurationModule } from './configuration/configuration.module'
import { DatabaseModule } from './database/database.module'
import { LoggerModule } from './logger/logger.module'
import { PermissionModule } from './permission/permission.module'

@Module({
  providers: [],
  imports: [EventEmitterModule.forRoot(), AuthModule, PermissionModule, DatabaseModule, LoggerModule, ConfigurationModule],
  exports: [EventEmitterModule, AuthModule, DatabaseModule, PermissionModule, ConfigurationModule],
})
export class InfrastructureModule {}
