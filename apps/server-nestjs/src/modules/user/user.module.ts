import { Module } from '@nestjs/common'
import { InfrastructureModule } from '../infrastructure/infrastructure.module'
import { UserController } from './user.controller'
import { UserService } from './user.service'

@Module({
  imports: [InfrastructureModule],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
