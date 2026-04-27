import { Module } from '@nestjs/common'

import { ConfigurationModule } from '../infrastructure/configuration/configuration.module'
import { InfrastructureModule } from '../infrastructure/infrastructure.module'

@Module({
  imports: [ConfigurationModule, InfrastructureModule],
  providers: [],
})
export class CoreModule {}
