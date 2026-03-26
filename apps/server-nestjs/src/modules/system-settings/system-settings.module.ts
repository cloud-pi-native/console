import { Module } from '@nestjs/common'
import { PrismaService } from '../../cpin-module/infrastructure/database/prisma.service'
import { InfrastructureModule } from '../../cpin-module/infrastructure/infrastructure.module'
import { SystemSettingsController } from './system-settings.controller'
import { SystemSettingsService } from './system-settings.service'

@Module({
  imports: [InfrastructureModule],
  controllers: [SystemSettingsController],
  providers: [PrismaService, SystemSettingsService],
  exports: [SystemSettingsService],
})
export class SystemSettingsModule {}
