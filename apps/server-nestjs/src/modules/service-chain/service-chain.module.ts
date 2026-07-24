import { Module } from '@nestjs/common'
import { AuthModule } from '../infrastructure/auth/auth.module'
import { DatabaseModule } from '../infrastructure/database/database.module'
import { EventsModule } from '../infrastructure/events/events.module'
import { UserPermissionModule } from '../infrastructure/permission/user/user.module'
import { OpenCdsClientService } from './open-cds-client.service'
import { ServiceChainController } from './service-chain.controller'
import { ServiceChainService } from './service-chain.service'

@Module({
  imports: [
    AuthModule,
    DatabaseModule,
    EventsModule,
    UserPermissionModule,
  ],
  controllers: [ServiceChainController],
  providers: [OpenCdsClientService, ServiceChainService],
  exports: [ServiceChainService],
})
export class ServiceChainModule {}
