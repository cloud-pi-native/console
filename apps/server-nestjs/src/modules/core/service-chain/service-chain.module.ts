import { Module } from '@nestjs/common'
import { InfrastructureModule } from '../../infrastructure/infrastructure.module'
import { OpenCdsClientService } from './open-cds-client.service'
import { ServiceChainController } from './service-chain.controller'
import { ServiceChainService } from './service-chain.service'

@Module({
  imports: [InfrastructureModule],
  controllers: [ServiceChainController],
  providers: [OpenCdsClientService, ServiceChainService],
})
export class ServiceChainModule {}
