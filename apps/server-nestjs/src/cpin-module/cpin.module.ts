import { Module } from '@nestjs/common';
import { AppService } from '@old-server/app';
import { ConnectionService } from '@old-server/connect';
import { PrepareAppService } from '@old-server/prepare-app';
import { ResourcesService } from '@old-server/resources';
import { ServerService } from '@old-server/server';
import { FastifyService } from '@old-server/utils/fastify';
import { CustomLoggerService } from '@old-server/utils/logger';
import { ApplicationInitializationModule } from './application-initialization/application-initialization.module';
import { InfrastructureModule } from './infrastructure/infrastructure.module';

// This module host the old "server code" of our backend.
// It it means to be empty in the future, by extracting from it
// as many modules as possible !
@Module({
    controllers: [],
    providers: [
        AppService,
        ConnectionService,
        FastifyService,
        CustomLoggerService,
        PrepareAppService,
        ResourcesService,
        ServerService,
    ],
    imports: [ApplicationInitializationModule, InfrastructureModule],
})
export class CpinModule {}
