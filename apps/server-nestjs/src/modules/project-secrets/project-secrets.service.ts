import type { ConfigType } from '@nestjs/config'
import { Inject, Injectable, Logger, NotFoundException, Optional } from '@nestjs/common'
import { trace } from '@opentelemetry/api'
import { z } from 'zod'
import { baseConfigFactory } from '../../config/base.config'
import { gitlabConfigFactory } from '../../config/gitlab.config'
import { PrismaService } from '../infrastructure/database/prisma.service'
import { StartActiveSpan } from '../infrastructure/telemetry/telemetry.decorator'
import { VaultClientService } from '../vault/vault-client.service'
import { specificallyDisabled } from '@cpn-console/hooks'
import { VaultService } from '../vault/vault.service'
import { generateProjectPath } from '../vault/vault.utils'
import { getProjectSlug } from './project-secrets-queries.utils'

const SecretValueSchema = z.union([
  z.string(),
  z.undefined().transform(() => ''),
  z.number().transform(String),
  z.bigint().transform(String),
  z.boolean().transform(String),
  z.null().transform(() => ''),
]).catch('')

export function parseSecretValue(value: string): string {
  return SecretValueSchema.parse(value)
}

@Injectable()
export class ProjectSecretsService {
  private readonly logger = new Logger(ProjectSecretsService.name)

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(baseConfigFactory.KEY) private readonly baseConfig: ConfigType<typeof baseConfigFactory>,
    @Inject(gitlabConfigFactory.KEY) private readonly gitlabConfig: ConfigType<typeof gitlabConfigFactory>,
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

    const relativePaths = await this.listProjectSecretPaths(projectId, project.slug)
    span?.setAttribute('vault.secretFiles.count', relativePaths.length)
    this.logger.debug(`project.get listed (projectId=${projectId}, slug=${project.slug}, secretFiles=${relativePaths.length})`)

    if (relativePaths.length === 0) {
      this.logger.log(`project.get completed (projectId=${projectId}, slug=${project.slug}, groupCount=0, keyCount=0)`)
      return {}
    }

    const result = await this.aggregateProjectSecrets(projectId, project.slug, relativePaths)
    const groupCount = Object.keys(result).length
    const keyCount = Object.values(result).reduce((acc, group) => acc + Object.keys(group).length, 0)
    span?.setAttributes({
      'vault.secretGroups.count': groupCount,
      'vault.secretKeys.count': keyCount,
    })
    this.logger.log(`project.get completed (projectId=${projectId}, slug=${project.slug}, groupCount=${groupCount}, keyCount=${keyCount})`)
    return result
  }

  // Historically emitted only when the `displayTriggerHint` global admin switch
  // (adminPlugin table, default ENABLED) was not explicitly disabled. The GITLAB group already carries
  // GIT_MIRROR_PROJECT_ID / GIT_MIRROR_TOKEN from the raw Vault read; we only synthesize the curl
  // one-liner here and never re-expose any other credential.
  private async formatGitlabTriggerHint(result: Record<string, Record<string, string>>, projectId: string): Promise<void> {
    const adminPlugin = await this.prisma.adminPlugin.findUnique({
      where: { pluginName_key: { pluginName: 'gitlab', key: 'displayTriggerHint' } },
      select: { value: true },
    }).catch(() => null)
    if (specificallyDisabled(adminPlugin?.value)) return
    const gitlab = result.GITLAB
    const gitlabProjectId = gitlab?.GIT_MIRROR_PROJECT_ID
    const token = gitlab?.GIT_MIRROR_TOKEN
    if (!gitlabProjectId || !token) return
    const apiUrl = this.gitlabConfig.url
    result.GITLAB['CURL COMMAND'] = [
      'curl -k',
      `--header "PRIVATE-TOKEN: ${token}"`,
      '-X POST',
      '--fail',
      `-F token=${token}`,
      '-F ref=main',
      `-F "variables[GIT_MIRROR_PROJECT_ID]=${gitlabProjectId}"`,
      `"${apiUrl}/api/v4/projects/${gitlabProjectId}/trigger/pipeline"`,
    ].join(' \\\n    ')
  }

  private async listProjectSecretPaths(projectId: string, slug: string): Promise<string[]> {
    if (!this.vault) {
      this.logger.warn(`project.get returning empty result (projectId=${projectId}): vault not configured`)
      return []
    }
    return this.vault.listProjectSecrets(slug).catch((error) => {
      this.logger.warn(
        `project.get secret listing failed (projectId=${projectId}, slug=${slug}): ${error instanceof Error ? error.message : String(error)}; returning an empty result`,
      )
      return [] as string[]
    })
  }

  private async aggregateProjectSecrets(
    projectId: string,
    slug: string,
    relativePaths: string[],
  ): Promise<Record<string, Record<string, string>>> {
    const projectPath = generateProjectPath(this.baseConfig.projectsRootDir, slug)

    const result: Record<string, Record<string, string>> = {}
    this.logger.debug(`project.get aggregating (projectId=${projectId}, slug=${slug}, secretFiles=${relativePaths.length})`)

    for (const relativePath of relativePaths) {
      const fullPath = `${projectPath}/${relativePath}`
      const secret = await this.vaultClient?.read<Record<string, any>>(fullPath).catch(() => null)
      if (!secret?.data) continue

      const [group, ...rest] = relativePath.split('/').filter(Boolean)
      if (!group) continue
      const prefix = rest.length ? `${rest.join('/')}.` : ''
      const groupObj = (result[group] ??= {})
      for (const [key, value] of Object.entries(secret.data)) {
        groupObj[`${prefix}${key}`] = parseSecretValue(value)
      }
    }

    if (result.GITLAB) {
      await this.formatGitlabTriggerHint(result, projectId)
    }

    return result
  }
}
