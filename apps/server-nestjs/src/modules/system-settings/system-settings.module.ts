import { Module } from '@nestjs/common'
import { DatabaseModule } from '../infrastructure/database/database.module'
import { SystemSettingsController } from './system-settings.controller'
import { SystemSettingsService } from './system-settings.service'

@Module({
  imports: [DatabaseModule],
  controllers: [SystemSettingsController],
  providers: [SystemSettingsService],
  exports: [SystemSettingsService],
})
export class SystemSettingsModule {}
