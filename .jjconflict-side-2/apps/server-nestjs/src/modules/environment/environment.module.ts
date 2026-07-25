import { Module } from '@nestjs/common'
import { AppEventsModule } from '../events/app-events.module'
import { InfrastructureModule } from '../infrastructure/infrastructure.module'
import { EnvironmentDatastoreService } from './environment-datastore.service'
import { EnvironmentValidationService } from './environment-validation.service'
import { EnvironmentController } from './environment.controller'
import { EnvironmentService } from './environment.service'

@Module({
  imports: [AppEventsModule, InfrastructureModule],
  controllers: [EnvironmentController],
  providers: [
    EnvironmentDatastoreService,
    EnvironmentValidationService,
    EnvironmentService,
  ],
})
export class EnvironmentModule {}
