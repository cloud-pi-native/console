import { Module } from '@nestjs/common'

import { ConfigurationModule } from '../infrastructure/configuration/configuration.module'
import { InfrastructureModule } from '../infrastructure/infrastructure.module'
import { AppService } from './app/app.service'
import { FastifyService } from './fastify/fastify.service'

@Module({
  imports: [ConfigurationModule, InfrastructureModule],
  providers: [AppService, FastifyService],
})
export class CoreModule {}
