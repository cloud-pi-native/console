import { Module } from '@nestjs/common'
import { ConfigurationModule } from '../../cpin-module/infrastructure/configuration/configuration.module'
import { OpenCdsClientService } from './open-cds-client.service'
import { ServiceChainController } from './service-chain.controller'
import { ServiceChainService } from './service-chain.service'

@Module({
  imports: [ConfigurationModule],
  controllers: [ServiceChainController],
  providers: [OpenCdsClientService, ServiceChainService],
})
export class ServiceChainModule {}
