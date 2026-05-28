import { Module } from '@nestjs/common'
import { AuthModule } from '../infrastructure/auth/auth.module'
import { InfrastructureModule } from '../infrastructure/infrastructure.module'
import { VaultModule } from '../vault/vault.module'
import { ProjectDatastoreService } from './project-datastore.service'
import { ProjectController } from './project.controller'
import { ProjectService } from './project.service'

@Module({
  imports: [InfrastructureModule, AuthModule, VaultModule],
  controllers: [ProjectController],
  providers: [
    ProjectService,
    ProjectDatastoreService,
  ],
  exports: [ProjectService],
})
export class ProjectModule {}
