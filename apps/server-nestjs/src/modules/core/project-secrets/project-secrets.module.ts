import { Module } from '@nestjs/common'
import { InfrastructureModule } from '../../infrastructure/infrastructure.module'
import { VaultModule } from '../../plugins/vault/vault.module.js'
import { ProjectSecretsController } from './project-secrets.controller.js'
import { ProjectSecretsService } from './project-secrets.service.js'

@Module({
  imports: [InfrastructureModule, VaultModule],
  controllers: [ProjectSecretsController],
  providers: [ProjectSecretsService],
  exports: [ProjectSecretsService],
})
export class ProjectSecretsModule {}
