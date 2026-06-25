import { Module } from '@nestjs/common'
import { InfrastructureModule } from '../../infrastructure/infrastructure.module'
import { ProjectRolesController } from './project-roles.controller'
import { ProjectRolesService } from './project-roles.service'

@Module({
  imports: [InfrastructureModule],
  controllers: [ProjectRolesController],
  providers: [ProjectRolesService],
})
export class ProjectRolesModule {}
