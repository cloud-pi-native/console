import { Module } from '@nestjs/common'
import { InfrastructureModule } from '../infrastructure/infrastructure.module.js'
import { ProjectModule } from '../project/project.module.js'
import { DeploymentDatastoreService } from './deployment-datastore.service.js'
import { DeploymentController } from './deployment.controller.js'
import { DeploymentService } from './deployment.service.js'

@Module({
  imports: [InfrastructureModule, ProjectModule],
  controllers: [DeploymentController],
  providers: [
    DeploymentDatastoreService,
    DeploymentService,
  ],
})
export class DeploymentModule {}
