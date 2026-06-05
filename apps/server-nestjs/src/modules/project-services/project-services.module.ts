import { Module } from '@nestjs/common'
import { InfrastructureModule } from '../infrastructure/infrastructure.module'
import { PluginModule } from '../plugin/plugin.module.js'
import { ProjectServicesController } from './project-services.controller.js'
import { ProjectServicesService } from './project-services.service.js'

@Module({
  imports: [InfrastructureModule, PluginModule],
  controllers: [ProjectServicesController],
  providers: [ProjectServicesService],
  exports: [ProjectServicesService],
})
export class ProjectServicesModule {}
