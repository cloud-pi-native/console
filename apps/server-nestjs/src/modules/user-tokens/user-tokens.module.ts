import { Module } from '@nestjs/common'
import { InfrastructureModule } from '../infrastructure/infrastructure.module'
import { UserTokensController } from './user-tokens.controller'
import { UserTokensService } from './user-tokens.service'

@Module({
  imports: [InfrastructureModule],
  controllers: [UserTokensController],
  providers: [UserTokensService],
  exports: [UserTokensService],
})
export class UserTokensModule {}
