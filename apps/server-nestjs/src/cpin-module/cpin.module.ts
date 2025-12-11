import { Module } from '@nestjs/common';
import { AppService } from '@old-server/app';
import { ConnectionService } from '@old-server/connect';
import { PrepareAppService } from '@old-server/prepare-app';
import { ResourcesService } from '@old-server/resources';
import { ServerService } from '@old-server/server';
import { FastifyService } from '@old-server/utils/fastify';
import { LoggerService } from '@old-server/utils/logger';

@Module({
    controllers: [],
    providers: [
        AppService,
        ConnectionService,
        FastifyService,
        LoggerService,
        PrepareAppService,
        ResourcesService,
        ServerService,
    ],
})
export class CpinModule {}
