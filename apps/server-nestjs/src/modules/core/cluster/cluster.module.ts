import { Module } from '@nestjs/common'
import { AuthModule } from '../../infrastructure/auth/auth.module'
import { DatabaseModule } from '../../infrastructure/database/database.module'
import { EventsModule } from '../../infrastructure/events/events.module'
import { UserPermissionModule } from '../../infrastructure/permission/user/user.module'
import { AppEventsModule } from '../events/app-events.module'
import { ClusterController } from './cluster.controller'

@Module({
  imports: [
    AppEventsModule,
    AuthModule,
    DatabaseModule,
    EventsModule,
    UserPermissionModule,
  ],
  controllers: [ClusterController],
})
export class ClusterModule {}
