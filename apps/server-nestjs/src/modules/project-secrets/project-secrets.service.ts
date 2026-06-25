import { Inject, Injectable, Logger, NotFoundException, Optional } from '@nestjs/common'
import { trace } from '@opentelemetry/api'
import { z } from 'zod'
import { ConfigurationService } from '../infrastructure/configuration/configuration.service'
import { PrismaService } from '../infrastructure/database/prisma.service'
import { StartActiveSpan } from '../infrastructure/telemetry/telemetry.decorator'
import { VaultClientService } from '../vault/vault-client.service'
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
    @Inject(ConfigurationService) private readonly config: ConfigurationService,
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
    const projectPath = generateProjectPath(this.config.projectRootDir, slug)

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

    return result
  }
}
