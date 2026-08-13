import type { ConfigType } from '@nestjs/config'
import { Inject, Injectable, Logger, NotFoundException, Optional } from '@nestjs/common'
import { trace } from '@opentelemetry/api'
import { baseConfigFactory } from '../../config/base.config'
import { gitlabConfigFactory } from '../../config/gitlab.config'
import { harborConfigFactory } from '../../config/harbor.config'
import { nexusConfigFactory } from '../../config/nexus.config'
import { PrismaService } from '../infrastructure/database/prisma.service'
import { StartActiveSpan } from '../infrastructure/telemetry/telemetry.decorator'
import { VaultClientService } from '../vault/vault-client.service'
import { specificallyDisabled, specificallyEnabled } from '@cpn-console/hooks'
import { VaultService } from '../vault/vault.service'
import { generateProjectPath } from '../vault/vault.utils'
import { getAdminPlugin, getProjectPlugins, getProjectSlug } from './project-secrets-queries.utils'
import { hasEntries, parseSecretValue } from './project-secrets.utils'

@Injectable()
export class ProjectSecretsService {
  private readonly logger = new Logger(ProjectSecretsService.name)

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(baseConfigFactory.KEY) private readonly baseConfig: ConfigType<typeof baseConfigFactory>,
    @Inject(gitlabConfigFactory.KEY) private readonly gitlabConfig: ConfigType<typeof gitlabConfigFactory>,
    @Inject(harborConfigFactory.KEY) private readonly harborConfig: ConfigType<typeof harborConfigFactory>,
    @Inject(nexusConfigFactory.KEY) private readonly nexusConfig: ConfigType<typeof nexusConfigFactory>,
    @Inject(VaultService) @Optional() private readonly vault?: VaultService,
    @Inject(VaultClientService) @Optional() private readonly vaultClient?: VaultClientService,
  ) {}

  @StartActiveSpan()
  async get(projectId: string): Promise<Record<string, Record<string, string>>> {
    const span = trace.getActiveSpan()
    span?.setAttribute('project.id', projectId)
    this.logger.log(`project.get started (projectId=${projectId})`)

    if (!this.vault || !this.vaultClient) {
      this.logger.warn(`project.get returning empty result (projectId=${projectId}): vault not configured`)
      return {}
    }
    const project = await getProjectSlug(this.prisma, projectId)
    if (!project) throw new NotFoundException('Projet introuvable')
    span?.setAttribute('project.slug', project.slug)

    const projectPath = generateProjectPath(this.baseConfig.projectsRootDir, project.slug)

    const [gitlab, nexus, registry, vault] = await Promise.all([
      this.readGroup(`${projectPath}/GITLAB`),
      this.readGroup(`${projectPath}/NEXUS`),
      this.readGroup(`${projectPath}/REGISTRY`),
      this.readGroup(`${projectPath}/VAULT`),
    ])

    const result = await this.synthesize(project.slug, projectId, { gitlab, nexus, registry, vault })

    const groupCount = Object.keys(result).length
    const keyCount = Object.values(result).reduce((acc, group) => acc + Object.keys(group).length, 0)
    span?.setAttributes({
      'vault.secretGroups.count': groupCount,
      'vault.secretKeys.count': keyCount,
    })
    this.logger.log(`project.get completed (projectId=${projectId}, slug=${project.slug}, groupCount=${groupCount}, keyCount=${keyCount})`)
    return result
  }

  private async readGroup(fullPath: string): Promise<Record<string, string>> {
    const secret = await this.vaultClient?.read<Record<string, any>>(fullPath).catch(() => null)
    const data = secret?.data ?? {}
    const out: Record<string, string> = {}
    for (const [key, value] of Object.entries(data)) {
      out[key] = parseSecretValue(value)
    }
    return out
  }

  private async synthesize(
    projectSlug: string,
    projectId: string,
    raw: {
      gitlab: Record<string, string>
      nexus: Record<string, string>
      registry: Record<string, string>
      vault: Record<string, string>
    },
  ): Promise<Record<string, Record<string, string>>> {
    const result: Record<string, Record<string, string>> = {}
    const gitlab = await this.synthesizeGitlab(raw.gitlab)
    if (hasEntries(gitlab)) result.GITLAB = gitlab
    const nexus = await this.synthesizeNexus(raw.nexus, projectSlug, projectId)
    if (hasEntries(nexus)) result.NEXUS = nexus
    const registry = this.synthesizeHarbor(raw.registry, projectSlug)
    if (hasEntries(registry)) result.REGISTRY = registry
    const vault = this.synthesizeVault(raw.vault, projectSlug)
    if (hasEntries(vault)) result.VAULT = vault
    return result
  }

  private async synthesizeGitlab(group: Record<string, string>): Promise<Record<string, string>> {
    const gitlabProjectId = group.GIT_MIRROR_PROJECT_ID
    const token = group.GIT_MIRROR_TOKEN
    const adminPlugin = await getAdminPlugin(this.prisma, 'gitlab', 'displayTriggerHint').catch(() => null)
    if (specificallyDisabled(adminPlugin?.value)) return group
    if (!gitlabProjectId || !token) return group
    const apiUrl = this.gitlabConfig.url
    return {
      ...group,
      'CURL COMMAND': [
        'curl -k',
        `--header "PRIVATE-TOKEN: ${token}"`,
        '-X POST',
        '--fail',
        `-F token=${token}`,
        '-F ref=main',
        `-F "variables[GIT_MIRROR_PROJECT_ID]=${gitlabProjectId}"`,
        `"${apiUrl}/api/v4/projects/${gitlabProjectId}/trigger/pipeline"`,
      ].join(' \\\n    '),
    }
  }

  // The raw read exposed the admin NEXUS_USERNAME / NEXUS_PASSWORD — the legacy nexus getSecrets
  // hook never returned these. Scrub them and restore the computed repo URLs instead.
  private async synthesizeNexus(
    group: Record<string, string>,
    slug: string,
    projectId: string,
  ): Promise<Record<string, string>> {
    if (!hasEntries(group)) return group
    const plugins = await getProjectPlugins(this.prisma, projectId)
    const nexusFlags = Object.fromEntries(
      (plugins?.plugins ?? []).filter(p => p.pluginName === 'nexus').map(p => [p.key, p.value]),
    )
    const { NEXUS_USERNAME, NEXUS_PASSWORD, ...rest } = group
    // ponytail: global nexus default (activateMavenRepoDefaultValue) is not wired in nestjs config yet;
    // only an explicit per-project enable is honored.
    const nexusUrl = this.nexusConfig.secretExposeInternalUrl && this.nexusConfig.internalUrl
      ? this.nexusConfig.internalUrl
      : this.nexusConfig.url
    if (specificallyEnabled(nexusFlags.activateMavenRepo)) {
      rest.MAVEN_REPO_RELEASE = `${nexusUrl}/${slug}-repository-release`
      rest.MAVEN_REPO_SNAPSHOT = `${nexusUrl}/${slug}-repository-snapshot`
    }
    if (specificallyEnabled(nexusFlags.activateNpmRepo)) {
      rest.NPM_REPO = `${nexusUrl}/${slug}-npm`
    }
    return rest
  }

  private synthesizeHarbor(group: Record<string, string>, slug: string): Record<string, string> {
    if (!hasEntries(group)) return group
    const harborHost = this.harborConfig.url.split('://')[1]
    return {
      ...group,
      'Registry base path': `${harborHost}/${slug}/`,
    }
  }

  private synthesizeVault(group: Record<string, string>, slug: string): Record<string, string> {
    if (!hasEntries(group)) return group
    return {
      ...group,
      '.spec.mount': slug,
      '.spec.vaultAuthRef': 'vault-auth',
    }
  }
}
