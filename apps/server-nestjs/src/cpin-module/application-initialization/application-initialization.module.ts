import { Module } from '@nestjs/common';

import { ApplicationInitializationService } from './application-initialization-service/application-initialization.service';
import { DatabaseInitializationService } from './database-initialization/database-initialization.service';
import { PluginManagementService } from './plugin-management/plugin-management.service';

@Module({
    providers: [
        ApplicationInitializationService,
        DatabaseInitializationService,
        PluginManagementService,
    ],
    exports: [ApplicationInitializationService],
})
export class ApplicationInitializationModule {}
