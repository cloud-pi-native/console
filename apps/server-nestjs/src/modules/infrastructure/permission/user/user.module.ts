import { Module } from '@nestjs/common'
import { AuthModule } from '../../auth/auth.module'
import { DatabaseModule } from '../../database/database.module'
import { UserPolicy } from './user-policy.service'
import { UserGuard } from './user.guard'
import { UserService } from './user.service'

@Module({
  imports: [
    AuthModule,
    DatabaseModule,
  ],
  providers: [
    UserGuard,
    UserService,
    UserPolicy,
  ],
  exports: [
    UserGuard,
    UserService,
    UserPolicy,
  ],
})
export class UserModule {}
