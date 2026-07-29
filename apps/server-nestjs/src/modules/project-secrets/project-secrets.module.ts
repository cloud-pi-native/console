import { Module } from '@nestjs/common'
import { ConditionalModule } from '@nestjs/config'
import { AuthModule } from '../infrastructure/auth/auth.module'
import { ConfigurationModule } from '../infrastructure/configuration/configuration.module'
import { DatabaseModule } from '../infrastructure/database/database.module'
import { ProjectPermissionModule } from '../infrastructure/permission/project/project.module'
import { VaultModule } from '../vault/vault.module'
import { ProjectSecretsController } from './project-secrets.controller'
import { ProjectSecretsService } from './project-secrets.service'

@Module({
  imports: [AuthModule, ConditionalModule.registerWhen(VaultModule, 'USE_VAULT'), ConfigurationModule, DatabaseModule, ProjectPermissionModule],
  controllers: [ProjectSecretsController],
  providers: [ProjectSecretsService],
  exports: [ProjectSecretsService],
})
export class ProjectSecretsModule {}
