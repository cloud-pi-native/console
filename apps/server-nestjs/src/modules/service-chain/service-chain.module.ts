import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { TerminusModule } from '@nestjs/terminus'
import { baseConfigFactory } from '../../config/base.config'
import { serviceChainConfigFactory } from '../../config/service-chain.config'
import { AuthModule } from '../infrastructure/auth/auth.module'
import { DatabaseModule } from '../infrastructure/database/database.module'
import { EventsModule } from '../infrastructure/events/events.module'
import { UserPermissionModule } from '../infrastructure/permission/user/user.module'
import { OpenCdsClientService } from './open-cds-client.service'
import { ServiceChainHealthService } from './service-chain-health.service'
import { ServiceChainController } from './service-chain.controller'
import { ServiceChainService } from './service-chain.service'

@Module({
  imports: [
    AuthModule,
    DatabaseModule,
    EventsModule,
    TerminusModule,
    UserPermissionModule,
    ConfigModule.forFeature(serviceChainConfigFactory),
    ConfigModule.forFeature(baseConfigFactory),
  ],
  controllers: [ServiceChainController],
  providers: [OpenCdsClientService, ServiceChainHealthService, ServiceChainService],
  exports: [ServiceChainService, ServiceChainHealthService],
})
export class ServiceChainModule {}
