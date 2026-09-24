import { Module } from '@nestjs/common'
import { AppEventsModule } from '../events/app-events.module'
import { ConfigModule } from '@nestjs/config'
import { baseConfigFactory } from '../../config/base.config'
import { AuthModule } from '../infrastructure/auth/auth.module'
import { DatabaseModule } from '../infrastructure/database/database.module'
import { EventsModule } from '../infrastructure/events/events.module'
import { UserPermissionModule } from '../infrastructure/permission/user/user.module'
import { ClusterController } from './cluster.controller'
import { ClusterService } from './cluster.service'

@Module({
  imports: [
    AppEventsModule,
    AuthModule,
    ConfigModule.forFeature(baseConfigFactory),
    DatabaseModule,
    EventsModule,
    UserPermissionModule,
  ],
  controllers: [ClusterController],
  providers: [ClusterService],
  exports: [ClusterService],
})
export class ClusterModule {}
