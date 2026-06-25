import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common'
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
    @Inject(VaultService) private readonly vault: VaultService,
    @Inject(VaultClientService) private readonly vaultClient: VaultClientService,
  ) {}

  @StartActiveSpan()
  async get(projectId: string): Promise<Record<string, Record<string, string>>> {
    const span = trace.getActiveSpan()
    span?.setAttribute('project.id', projectId)
    this.logger.log(`project.get started (projectId=${projectId})`)
    try {
      const project = await getProjectSlug(this.prisma, projectId)
      if (!project) throw new NotFoundException('Projet introuvable')
      span?.setAttribute('project.slug', project.slug)
      const projectPath = generateProjectPath(this.config.projectRootDir, project.slug)

      const result: Record<string, Record<string, string>> = {}
      const relativePaths = await this.vault.listProjectSecrets(project.slug).catch((error) => {
        this.logger.warn(
          `project.get secret listing failed (projectId=${projectId}, slug=${project.slug}): ${error instanceof Error ? error.message : String(error)}; returning an empty result`,
        )
        return [] as string[]
      })
      span?.setAttribute('vault.secretFiles.count', relativePaths.length)
      this.logger.debug(`project.get listed (projectId=${projectId}, slug=${project.slug}, secretFiles=${relativePaths.length})`)

      for (const relativePath of relativePaths) {
        const fullPath = `${projectPath}/${relativePath}`
        const secret = await this.vaultClient.read<Record<string, any>>(fullPath).catch(() => null)
        if (!secret?.data) continue

        const [group, ...rest] = relativePath.split('/').filter(Boolean)
        if (!group) continue
        const prefix = rest.length ? `${rest.join('/')}.` : ''
        const groupObj = (result[group] ??= {})
        for (const [key, value] of Object.entries(secret.data)) {
          groupObj[`${prefix}${key}`] = parseSecretValue(value)
        }
      }

      const groupCount = Object.keys(result).length
      const keyCount = Object.values(result).reduce((acc, group) => acc + Object.keys(group).length, 0)
      span?.setAttributes({
        'vault.secretGroups.count': groupCount,
        'vault.secretKeys.count': keyCount,
      })
      this.logger.log(`project.get completed (projectId=${projectId}, slug=${project.slug}, groupCount=${groupCount}, keyCount=${keyCount})`)
      return result
    } catch (error) {
      this.logger.error(
        `project.get failed (projectId=${projectId}): ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      )
      throw error
    }
  }
}
