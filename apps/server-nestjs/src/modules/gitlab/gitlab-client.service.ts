import { ConfigurationService } from '@/cpin-module/infrastructure/configuration/configuration.service'
import { Gitlab } from '@gitbeaker/core'
import { Injectable, Inject } from '@nestjs/common'

@Injectable()
export class GitlabClientService extends Gitlab {
  constructor(
    @Inject(ConfigurationService) readonly configService: ConfigurationService,
  ) {
    super({
      token: configService.gitlabToken,
      host: configService.gitlabInternalUrl,
    })
  }
}
