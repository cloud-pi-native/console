import { Module } from '@nestjs/common'
import { AuthModule } from '../../infrastructure/auth/auth.module'
import { DatabaseModule } from '../../infrastructure/database/database.module'
import { UserPermissionModule } from '../../infrastructure/permission/user/user.module'
import { ExperimentalFeatureController } from './experimental-feature.controller'
import { ExperimentalFeatureService } from './experimental-feature.service'

@Module({
  imports: [AuthModule, DatabaseModule, UserPermissionModule],
  controllers: [ExperimentalFeatureController],
  providers: [ExperimentalFeatureService],
})
export class ExperimentalFeatureModule {}
