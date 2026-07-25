import { Module } from '@nestjs/common'
import { InfrastructureModule } from '../infrastructure/infrastructure.module'
import { LogModule } from '../log/log.module'
import { AppEventsService } from './app-events.service'

@Module({
  imports: [InfrastructureModule, LogModule],
  providers: [AppEventsService],
  exports: [AppEventsService],
})
export class AppEventsModule {}
