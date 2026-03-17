import { ConfigurationService } from '@/cpin-module/infrastructure/configuration/configuration.service'
import { Inject, Injectable } from '@nestjs/common'
import { getMavenRepoNames, getNpmRepoNames } from './nexus.utils'

@Injectable()
export class NexusService {
  constructor(
    @Inject(ConfigurationService) private readonly config: ConfigurationService,
  ) {}

  getProjectSecrets(args: { projectSlug: string, enableMaven: boolean, enableNpm: boolean }) {
    const projectSlug = args.projectSlug
    const nexusUrl = this.config.nexusSecretExposedUrl!
    const secrets: Record<string, string> = {}
    if (args.enableMaven) {
      const names = getMavenRepoNames(projectSlug)
      secrets.MAVEN_REPO_RELEASE = `${nexusUrl}/${names.hosted[0].repo}`
      secrets.MAVEN_REPO_SNAPSHOT = `${nexusUrl}/${names.hosted[1].repo}`
    }
    if (args.enableNpm) {
      const names = getNpmRepoNames(projectSlug)
      secrets.NPM_REPO = `${nexusUrl}/${names.hosted[0].repo}`
    }
    return secrets
  }
}
