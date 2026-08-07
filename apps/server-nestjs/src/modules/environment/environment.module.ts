import { Module } from '@nestjs/common'
import { AppEventsModule } from '../events/app-events.module'
import { AuthModule } from '../infrastructure/auth/auth.module'
import { DatabaseModule } from '../infrastructure/database/database.module'
import { ProjectPermissionModule } from '../infrastructure/permission/project/project.module'
import { EnvironmentDatastoreService } from './environment-datastore.service'
import { EnvironmentValidationService } from './environment-validation.service'
import { EnvironmentController } from './environment.controller'
import { EnvironmentService } from './environment.service'

@Module({
  imports: [
    AppEventsModule,
    AuthModule,
    DatabaseModule,
    ProjectPermissionModule,
  ],
  controllers: [EnvironmentController],
  providers: [
    EnvironmentDatastoreService,
    EnvironmentValidationService,
    EnvironmentService,
  ],
})
export class EnvironmentModule {}
