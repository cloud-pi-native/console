import { Module } from '@nestjs/common'
import { AppEventsModule } from '../events/app-events.module'
import { InfrastructureModule } from '../infrastructure/infrastructure.module'
import { LogModule } from '../log/log.module'
import { ProjectController } from './project.controller'
import { ProjectService } from './project.service'

@Module({
  imports: [AppEventsModule, InfrastructureModule, LogModule],
  controllers: [ProjectController],
  providers: [ProjectService],
  exports: [ProjectService],
})
export class ProjectModule {}
