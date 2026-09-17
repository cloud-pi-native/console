import { Module } from '@nestjs/common'
import { InfrastructureModule } from '../infrastructure/infrastructure.module'
import { LogModule } from '../log/log.module'
import { ZoneController } from './zone.controller'
import { ZoneService } from './zone.service'

@Module({
  imports: [
    InfrastructureModule,
    LogModule,
  ],
  controllers: [ZoneController],
  providers: [ZoneService],
  exports: [ZoneService],
})
export class ZoneModule {}
