import { Module } from '@nestjs/common'
import { AppEventsModule } from '../events/app-events.module'
import { AppEventsModule } from '../events/app-events.module'
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
    DatabaseModule,
    EventsModule,
    UserPermissionModule,
  ],
  controllers: [ClusterController],
  providers: [ClusterService],
  exports: [ClusterService],
})
export class ClusterModule {}
