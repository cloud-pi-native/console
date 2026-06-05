import { Module } from '@nestjs/common'
import { InfrastructureModule } from '../infrastructure/infrastructure.module'
import { PluginModule } from '../plugin/plugin.module.js'
import { ServicesController } from './services.controller.js'
import { ServicesService } from './services.service.js'

@Module({
  imports: [InfrastructureModule, PluginModule],
  controllers: [ServicesController],
  providers: [ServicesService],
  exports: [ServicesService],
})
export class ServicesModule {}
