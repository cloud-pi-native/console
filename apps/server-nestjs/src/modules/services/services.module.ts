import { Module } from '@nestjs/common'
import { InfrastructureModule } from '../infrastructure/infrastructure.module'
import { PluginModule } from '../plugin/plugin.module'
import { ServicesController } from './services.controller'
import { ServicesService } from './services.service'

@Module({
  imports: [InfrastructureModule, PluginModule],
  controllers: [ServicesController],
  providers: [ServicesService],
  exports: [ServicesService],
})
export class ServicesModule {}
