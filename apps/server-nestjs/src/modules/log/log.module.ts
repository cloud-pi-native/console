import { Module } from '@nestjs/common'
import { InfrastructureModule } from '../infrastructure/infrastructure.module'
import { LogController } from './log.controller'
import { LogService } from './log.service'

@Module({
  imports: [InfrastructureModule],
  controllers: [LogController],
  providers: [LogService],
  exports: [LogService],
})
export class LogModule {}
