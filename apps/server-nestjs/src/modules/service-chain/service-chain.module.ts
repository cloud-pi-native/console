import { Module } from '@nestjs/common'
import { TerminusModule } from '@nestjs/terminus'
import { AuthModule } from '../infrastructure/auth/auth.module'
import { ConfigurationModule } from '../infrastructure/configuration/configuration.module'
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
    ConfigurationModule,
    DatabaseModule,
    EventsModule,
    UserPermissionModule,
    TerminusModule,
  ],
  controllers: [ServiceChainController],
  providers: [OpenCdsClientService, ServiceChainHealthService, ServiceChainService],
  exports: [ServiceChainService, ServiceChainHealthService],
})
export class ServiceChainModule {}
