import { Module } from '@nestjs/common'
import { AuthModule } from '../infrastructure/auth/auth.module'
import { InfrastructureModule } from '../infrastructure/infrastructure.module'
import { AdminRoleController } from './admin-role.controller'
import { AdminRoleService } from './admin-role.service'

@Module({
  imports: [InfrastructureModule, AuthModule],
  controllers: [AdminRoleController],
  providers: [AdminRoleService],
  exports: [AdminRoleService],
})
export class AdminRoleModule {}
