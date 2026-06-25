import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { baseConfigFactory } from '../../config/base.config'
import { AuthModule } from '../infrastructure/auth/auth.module'
import { DatabaseModule } from '../infrastructure/database/database.module'
import { ProjectPermissionModule } from '../infrastructure/permission/project/project.module'
import { VaultModule } from '../vault/vault.module'
import { ProjectSecretsController } from './project-secrets.controller'
import { ProjectSecretsService } from './project-secrets.service'

@Module({
  imports: [AuthModule, DatabaseModule, ProjectPermissionModule, VaultModule, ConfigModule.forFeature(baseConfigFactory)],
  controllers: [ProjectSecretsController],
  providers: [ProjectSecretsService],
  exports: [ProjectSecretsService],
})
export class ProjectSecretsModule {}
