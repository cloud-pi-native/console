import { Module } from '@nestjs/common'
import { AppEventsModule } from '../events/app-events.module'
import { AuthModule } from '../infrastructure/auth/auth.module'
import { DatabaseModule } from '../infrastructure/database/database.module'
import { EventsModule } from '../infrastructure/events/events.module'
import { ProjectPermissionModule } from '../infrastructure/permission/project/project.module'
import { ProjectModule } from '../project/project.module'
import { DeploymentDatastoreService } from './deployment-datastore.service'
import { DeploymentController } from './deployment.controller'
import { DeploymentService } from './deployment.service'

@Module({
  imports: [AppEventsModule, AuthModule, DatabaseModule, EventsModule, ProjectModule, ProjectPermissionModule],
  controllers: [DeploymentController],
  providers: [
    DeploymentDatastoreService,
    DeploymentService,
  ],
})
export class DeploymentModule {}
