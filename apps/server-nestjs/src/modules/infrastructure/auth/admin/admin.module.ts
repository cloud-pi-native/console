import { forwardRef, Module } from '@nestjs/common'
import { DatabaseModule } from '../../database/database.module'
import { AuthModule } from '../auth.module'
import { AdminPolicy } from './admin-policy.service'
import { AdminGuard } from './admin.guard'
import { AdminService } from './admin.service'

@Module({
  imports: [
    forwardRef(() => AuthModule),
    DatabaseModule,
  ],
  providers: [
    AdminGuard,
    AdminService,
    AdminPolicy,
  ],
  exports: [
    AdminGuard,
    AdminService,
    AdminPolicy,
  ],
})
export class AdminModule {}
