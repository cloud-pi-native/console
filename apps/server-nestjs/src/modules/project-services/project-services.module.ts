import { Module } from '@nestjs/common'
import { AuthModule } from '../infrastructure/auth/auth.module'
import { DatabaseModule } from '../infrastructure/database/database.module'
import { ProjectPermissionModule } from '../infrastructure/permission/project/project.module'
import { PluginModule } from '../plugin/plugin.module'
import { ProjectServicesController } from './project-services.controller'
import { ProjectServicesService } from './project-services.service'

@Module({
  imports: [AuthModule, DatabaseModule, PluginModule, ProjectPermissionModule],
  controllers: [ProjectServicesController],
  providers: [ProjectServicesService],
  exports: [ProjectServicesService],
})
export class ProjectServicesModule {}
