import { Module } from '@nestjs/common'
import { InfrastructureModule } from '../infrastructure/infrastructure.module'
import { PluginModule } from '../plugin/plugin.module'
import { ProjectServicesController } from './project-services.controller'
import { ProjectServicesService } from './project-services.service'

@Module({
  imports: [InfrastructureModule, PluginModule],
  controllers: [ProjectServicesController],
  providers: [ProjectServicesService],
  exports: [ProjectServicesService],
})
export class ProjectServicesModule {}
