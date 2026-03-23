import { Module } from '@nestjs/common'
import { CpinModule } from './cpin-module/cpin.module'
import { HealthzModule } from './modules/healthz/healthz.module'
import { SystemSettingsModule } from './modules/system-settings/system-settings.module'

@Module({
  imports: [CpinModule, HealthzModule, SystemSettingsModule],
  controllers: [],
  providers: [],
})
export class MainModule {}
