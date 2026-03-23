import { Module } from '@nestjs/common'
import { CpinModule } from './cpin-module/cpin.module'
import { HealthzModule } from './modules/healthz/healthz.module'

@Module({
  imports: [CpinModule, HealthzModule],
  controllers: [],
  providers: [],
})
export class MainModule {}
