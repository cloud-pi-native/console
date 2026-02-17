import { Module } from '@nestjs/common'

import { ConfigurationModule } from '../infrastructure/configuration/configuration.module'
import { InfrastructureModule } from '../infrastructure/infrastructure.module'
import { ApplicationInitializationService } from './application-initialization-service/application-initialization.service'
import { DatabaseInitializationService } from './database-initialization/database-initialization.service'
import { PluginManagementService } from './plugin-management/plugin-management.service'

@Module({
  imports: [ConfigurationModule, InfrastructureModule],
  providers: [
    ApplicationInitializationService,
    DatabaseInitializationService,
    PluginManagementService,
  ],
  exports: [ApplicationInitializationService],
})
export class ApplicationInitializationModule {}
