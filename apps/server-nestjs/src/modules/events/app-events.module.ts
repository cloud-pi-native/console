import { Module } from '@nestjs/common'
import { DatabaseModule } from '../infrastructure/database/database.module'
import { EventsModule } from '../infrastructure/events/events.module'
import { LogModule } from '../log/log.module'
import { AppEventsService } from './app-events.service'

@Module({
  imports: [
    DatabaseModule,
    EventsModule,
    LogModule,
  ],
  providers: [AppEventsService],
  exports: [AppEventsService],
})
export class AppEventsModule {}
