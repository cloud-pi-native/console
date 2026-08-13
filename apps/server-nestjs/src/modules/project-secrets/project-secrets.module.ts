import { Module } from '@nestjs/common'
import { ConditionalModule } from '@nestjs/config'
import { GitlabModule } from '../gitlab/gitlab.module'
import { AuthModule } from '../infrastructure/auth/auth.module'
import { DatabaseModule } from '../infrastructure/database/database.module'
import { ProjectPermissionModule } from '../infrastructure/permission/project/project.module'
import { NexusModule } from '../nexus/nexus.module'
import { RegistryModule } from '../registry/registry.module'
import { VaultModule } from '../vault/vault.module'
import { ProjectSecretsController } from './project-secrets.controller'
import { ProjectSecretsService } from './project-secrets.service'

@Module({
  imports: [
    AuthModule,
    DatabaseModule,
    ProjectPermissionModule,
    ConditionalModule.registerWhen(GitlabModule, 'USE_GITLAB'),
    ConditionalModule.registerWhen(NexusModule, 'USE_NEXUS'),
    ConditionalModule.registerWhen(RegistryModule, 'USE_HARBOR'),
    ConditionalModule.registerWhen(VaultModule, 'USE_VAULT'),
  ],
  controllers: [ProjectSecretsController],
  providers: [ProjectSecretsService],
  exports: [ProjectSecretsService],
})
export class ProjectSecretsModule {}
