import { ConfigurationService } from '../../cpin-module/infrastructure/configuration/configuration.service'
import { Inject, Injectable } from '@nestjs/common'
import { generateMavenHostedRepoName, generateNpmHostedRepoName } from './nexus.utils'

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
      secrets.MAVEN_REPO_RELEASE = `${nexusUrl}/${generateMavenHostedRepoName(projectSlug, 'release')}`
      secrets.MAVEN_REPO_SNAPSHOT = `${nexusUrl}/${generateMavenHostedRepoName(projectSlug, 'snapshot')}`
    }
    if (args.enableNpm) {
      secrets.NPM_REPO = `${nexusUrl}/${generateNpmHostedRepoName(projectSlug)}`
    }
    return secrets
  }
}
