import { Module } from '@nestjs/common'
import { InfrastructureModule } from '../infrastructure/infrastructure.module'
import { VaultModule } from '../vault/vault.module'
import { ProjectSecretsController } from './project-secrets.controller'
import { ProjectSecretsService } from './project-secrets.service'

@Module({
  imports: [InfrastructureModule, VaultModule],
  controllers: [ProjectSecretsController],
  providers: [ProjectSecretsService],
})
export class ProjectSecretsModule {}
