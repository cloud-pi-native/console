import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { EventEmitterModule } from '@nestjs/event-emitter'
import { baseConfigFactory } from '../../../config/base.config'

@Module({
  imports: [EventEmitterModule.forRoot(), ConfigModule.forFeature(baseConfigFactory)],
  exports: [EventEmitterModule],
})
export class EventsModule {}
