import { Module } from '@nestjs/common'
import { InfrastructureModule } from '../../infrastructure/infrastructure.module'
import { LogModule } from '../log/log.module.js'
import { ProjectController } from './project.controller'
import { ProjectService } from './project.service'

@Module({
  imports: [InfrastructureModule, LogModule],
  controllers: [ProjectController],
  providers: [ProjectService],
  exports: [ProjectService],
})
export class ProjectModule {}
