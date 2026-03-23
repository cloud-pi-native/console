import { Module } from '@nestjs/common'
import { TerminusModule } from '@nestjs/terminus'
import { DatabaseModule } from '../../cpin-module/infrastructure/database/database.module'
import { HealthzController } from './healthz.controller'

@Module({
  imports: [TerminusModule, DatabaseModule],
  controllers: [HealthzController],
})
export class HealthzModule {}
