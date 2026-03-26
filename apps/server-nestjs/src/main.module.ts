import { Module } from '@nestjs/common'
import { CpinModule } from './cpin-module/cpin.module'
import { HealthzModule } from './modules/healthz/healthz.module'
import { SystemSettingsModule } from './modules/system-settings/system-settings.module'
import { VersionModule } from './modules/version/version.module'

@Module({
  imports: [CpinModule, HealthzModule, SystemSettingsModule, VersionModule],
  controllers: [],
  providers: [],
})
export class MainModule {}
