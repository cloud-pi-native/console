import { Module } from '@nestjs/common'
import { InfrastructureModule } from '../../infrastructure/infrastructure.module'
import { AppEventsModule } from '../events/app-events.module'
import { ZoneController } from './zone.controller'
import { ZoneService } from './zone.service'

@Module({
  imports: [
    AppEventsModule,
    InfrastructureModule,
  ],
  controllers: [ZoneController],
  providers: [ZoneService],
  exports: [ZoneService],
})
export class ZoneModule {}
