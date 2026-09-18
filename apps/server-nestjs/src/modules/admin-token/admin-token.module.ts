import { Module } from '@nestjs/common'
import { InfrastructureModule } from '../infrastructure/infrastructure.module'
import { AdminTokenController } from './admin-token.controller'
import { AdminTokenService } from './admin-token.service'

@Module({
  imports: [InfrastructureModule],
  controllers: [AdminTokenController],
  providers: [AdminTokenService],
  exports: [AdminTokenService],
})
export class AdminTokenModule {}
