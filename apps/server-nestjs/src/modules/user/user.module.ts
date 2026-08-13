import { Module } from '@nestjs/common'
import { AuthModule } from '../infrastructure/auth/auth.module'
import { DatabaseModule } from '../infrastructure/database/database.module'
import { EventsModule } from '../infrastructure/events/events.module'
import { UserPermissionModule } from '../infrastructure/permission/user/user.module'
import { UserGuard } from '../infrastructure/permission/user/user.guard'
import { UserController } from './user.controller'
import { UserService } from './user.service'

@Module({
  imports: [
    AuthModule,
    DatabaseModule,
    EventsModule,
    UserPermissionModule,
  ],
  controllers: [UserController],
  providers: [UserGuard, UserService],
  exports: [UserService],
})
export class UserModule {}
