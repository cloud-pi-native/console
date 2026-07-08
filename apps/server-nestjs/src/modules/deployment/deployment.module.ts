import { Module } from '@nestjs/common'
import { AppEventsModule } from '../events/app-events.module'
import { InfrastructureModule } from '../infrastructure/infrastructure.module'
import { DeploymentDatastoreService } from './deployment-datastore.service'
import { DeploymentController } from './deployment.controller'
import { DeploymentService } from './deployment.service'

@Module({
  imports: [AppEventsModule, InfrastructureModule],
  controllers: [DeploymentController],
  providers: [
    DeploymentDatastoreService,
    DeploymentService,
  ],
})
export class DeploymentModule {}
