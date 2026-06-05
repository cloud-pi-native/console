import { Module } from '@nestjs/common'
import { AuthModule } from '../infrastructure/auth/auth.module'
import { InfrastructureModule } from '../infrastructure/infrastructure.module'
import { VaultModule } from '../vault/vault.module'
import { ProjectController } from './project.controller'
import { ProjectService } from './project.service'

@Module({
  imports: [InfrastructureModule, AuthModule, VaultModule],
  controllers: [ProjectController],
  providers: [
    ProjectService,
  ],
  exports: [ProjectService],
})
export class ProjectModule {}
