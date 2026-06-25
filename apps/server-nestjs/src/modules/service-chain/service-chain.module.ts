import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { AuthModule } from '../infrastructure/auth/auth.module'
import { DatabaseModule } from '../infrastructure/database/database.module'
import { EventsModule } from '../infrastructure/events/events.module'
import { UserPermissionModule } from '../infrastructure/permission/user/user.module'
import { opencdsConfigFactory } from '../../config/opencds.config'
import { baseConfigFactory } from '../../config/base.config'
import { OpenCdsClientService } from './open-cds-client.service'
import { ServiceChainController } from './service-chain.controller'
import { ServiceChainService } from './service-chain.service'

@Module({
  imports: [
    AuthModule,
    DatabaseModule,
    EventsModule,
    UserPermissionModule,
    ConfigModule.forFeature(opencdsConfigFactory),
    ConfigModule.forFeature(baseConfigFactory),
  ],
  controllers: [ServiceChainController],
  providers: [OpenCdsClientService, ServiceChainService],
  exports: [ServiceChainService],
})
export class ServiceChainModule {}
