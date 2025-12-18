import { Module } from '@nestjs/common';

import { ConfigurationModule } from '../infrastructure/configuration/configuration.module';
import { InfrastructureModule } from '../infrastructure/infrastructure.module';
import { AppService } from './app/app.service';
import { FastifyService } from './fastify/fastify.service';
import { RouterModule } from './router/router.module';

@Module({
    imports: [
        ConfigurationModule,
        RouterModule,
        InfrastructureModule,
    ],
    providers: [
        AppService,
        FastifyService
    ],
})
export class CoreModule {}
