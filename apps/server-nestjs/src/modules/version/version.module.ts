import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import baseConfigFactory from '../../config/base'
import { VersionController } from './version.controller'

@Module({
  imports: [ConfigModule.forFeature([baseConfigFactory])],
  controllers: [VersionController],
})
export class VersionModule {}
