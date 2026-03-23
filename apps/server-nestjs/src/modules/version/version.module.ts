import { Module } from '@nestjs/common'
import { ConfigurationModule } from '../../cpin-module/infrastructure/configuration/configuration.module'
import { VersionController } from './version.controller'

@Module({
  imports: [ConfigurationModule],
  controllers: [VersionController],
})
export class VersionModule {}
