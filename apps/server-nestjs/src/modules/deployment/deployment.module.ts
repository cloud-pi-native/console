import { Module } from '@nestjs/common'
import { InfrastructureModule } from '../infrastructure/infrastructure.module'
import { ProjectModule } from '../project/project.module'
import { DeploymentDatastoreService } from './deployment-datastore.service'
import { DeploymentController } from './deployment.controller'
import { DeploymentService } from './deployment.service'

@Module({
  imports: [InfrastructureModule, ProjectModule],
  controllers: [DeploymentController],
  providers: [
    DeploymentDatastoreService,
    DeploymentService,
  ],
})
export class DeploymentModule {}
