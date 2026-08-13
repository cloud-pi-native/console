import { Module } from '@nestjs/common'
import { ConditionalModule, ConfigModule } from '@nestjs/config'
import { AuthModule } from '../infrastructure/auth/auth.module'
import { DatabaseModule } from '../infrastructure/database/database.module'
import { ProjectPermissionModule } from '../infrastructure/permission/project/project.module'
import { VaultModule } from '../vault/vault.module'
import { gitlabConfigFactory } from '../../config/gitlab.config'
import { ProjectSecretsController } from './project-secrets.controller'
import { ProjectSecretsService } from './project-secrets.service'

@Module({
  imports: [
    AuthModule,
    DatabaseModule,
    ProjectPermissionModule,
    ConditionalModule.registerWhen(VaultModule, 'USE_VAULT'),
    ConfigModule.forFeature(gitlabConfigFactory),
  ],
  controllers: [ProjectSecretsController],
  providers: [ProjectSecretsService],
  exports: [ProjectSecretsService],
})
export class ProjectSecretsModule {}
