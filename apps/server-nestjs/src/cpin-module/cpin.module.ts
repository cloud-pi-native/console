import { Module } from '@nestjs/common'

import { CoreModule } from './core/core.module'
import { InfrastructureModule } from './infrastructure/infrastructure.module'

// This module host the old "server code" of our backend.
// It it means to be empty in the future, by extracting from it
// as many modules as possible !
@Module({
  imports: [
    CoreModule,
    InfrastructureModule,
  ],
})
export class CpinModule {}
