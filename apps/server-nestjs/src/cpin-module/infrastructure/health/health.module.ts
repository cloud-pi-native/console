import { Module } from '@nestjs/common'
import { TerminusModule } from '@nestjs/terminus'
import { DatabaseHealthService } from '../database/database-health.service'
import { HealthController } from './health.controller'

@Module({
  imports: [
    TerminusModule,
    DatabaseHealthService,
  ],
  controllers: [HealthController],
})
export class HealthModule {}
