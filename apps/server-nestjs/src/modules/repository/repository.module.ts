import { Module } from '@nestjs/common'
import { ConditionalModule } from '@nestjs/config'
import { AppEventsModule } from '../events/app-events.module'
import { AuthModule } from '../infrastructure/auth/auth.module'
import { DatabaseModule } from '../infrastructure/database/database.module'
import { ProjectPermissionModule } from '../infrastructure/permission/project/project.module'
import { VaultModule } from '../vault/vault.module'
import { RepositoryDatastoreService } from './repository-datastore.service'
import { RepositoryController } from './repository.controller'
import { RepositoryService } from './repository.service'

@Module({
  imports: [
    AppEventsModule,
    AuthModule,
    DatabaseModule,
    ProjectPermissionModule,
    ConditionalModule.registerWhen(VaultModule, 'USE_VAULT'),
  ],
  controllers: [RepositoryController],
  providers: [
    RepositoryDatastoreService,
    RepositoryService,
  ],
})
export class RepositoryModule {}
