import { Module } from '@nestjs/common'
import { InfrastructureModule } from '../infrastructure/infrastructure.module'
import { VaultModule } from '../vault/vault.module.js'
import { ProjectSecretsController } from './project-secrets.controller.js'
import { ProjectSecretsService } from './project-secrets.service.js'

@Module({
  imports: [InfrastructureModule, VaultModule],
  controllers: [ProjectSecretsController],
  providers: [ProjectSecretsService],
  exports: [ProjectSecretsService],
})
export class ProjectSecretsModule {}
