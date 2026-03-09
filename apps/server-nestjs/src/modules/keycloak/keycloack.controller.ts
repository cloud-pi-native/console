import { Controller, Get } from '@nestjs/common'
import { Monitor, type MonitorInfos, MonitorStatus } from '@cpn-console/shared'
import type { ConfigurationService } from '../../cpin-module/infrastructure/configuration/configuration.service'

@Controller('keycloak')
export class KeycloakController {
  private monitor: Monitor

  constructor(
    private readonly configService: ConfigurationService,
  ) {
    this.monitor = new Monitor(async (instance): Promise<MonitorInfos> => {
      instance.lastStatus.lastUpdateTimestamp = (new Date()).getTime()
      try {
        if (!this.configService.keycloakUrl) {
          throw new Error('keycloakUrl is not defined')
        }
        const res = await fetch(this.configService.keycloakUrl)
        if (res.status === 200) {
          instance.lastStatus.status = MonitorStatus.OK
          instance.lastStatus.message = MonitorStatus.OK
          return instance.lastStatus
        }
        instance.lastStatus.status = MonitorStatus.ERROR
        instance.lastStatus.message = 'Service en erreur'
        return instance.lastStatus
      } catch (error) {
        instance.lastStatus.message = 'Erreur lors la requête'
        instance.lastStatus.status = MonitorStatus.UNKNOW
        instance.lastStatus.cause = error
      }
      return instance.lastStatus
    })
  }

  @Get('status')
  async status(): Promise<MonitorInfos> {
    return this.monitor.lastStatus
  }
}
