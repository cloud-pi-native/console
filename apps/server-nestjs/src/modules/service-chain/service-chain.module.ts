import { Module } from '@nestjs/common'
import { AuthModule } from '../../cpin-module/infrastructure/auth/auth.module'
import { ConfigurationModule } from '../../cpin-module/infrastructure/configuration/configuration.module'
import { OpenCdsClientService } from './open-cds-client.service'
import { ServiceChainController } from './service-chain.controller'
import { ServiceChainService } from './service-chain.service'

@Module({
  imports: [ConfigurationModule, AuthModule],
  controllers: [ServiceChainController],
  providers: [OpenCdsClientService, ServiceChainService],
})
export class ServiceChainModule {}
