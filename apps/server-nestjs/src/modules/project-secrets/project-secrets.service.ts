import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common'
import { trace } from '@opentelemetry/api'
import { ConfigurationService } from '../infrastructure/configuration/configuration.service.js'
import { PrismaService } from '../infrastructure/database/prisma.service.js'
import { StartActiveSpan } from '../infrastructure/telemetry/telemetry.decorator'
import { parseSecretValue } from '../project/project.utils.js'
import { VaultClientService } from '../vault/vault-client.service.js'
import { VaultService } from '../vault/vault.service.js'
import { generateProjectPath } from '../vault/vault.utils.js'

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
  async getSecrets(projectId: string): Promise<Record<string, Record<string, string>>> {
    const span = trace.getActiveSpan()
    span?.setAttribute('project.id', projectId)
    this.logger.log(`project.getSecrets started (projectId=${projectId})`)
    try {
      const project = await this.getProjectSlug(projectId)
      if (!project) throw new NotFoundException()
      span?.setAttribute('project.slug', project.slug)
      const projectPath = generateProjectPath(this.config.projectRootDir, project.slug)

      const result: Record<string, Record<string, string>> = {}
      const relativePaths = await this.vault.listProjectSecrets(project.slug)
      span?.setAttribute('vault.secretFiles.count', relativePaths.length)
      this.logger.debug(`project.getSecrets listed (projectId=${projectId}, slug=${project.slug}, secretFiles=${relativePaths.length})`)

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
      this.logger.log(`project.getSecrets completed (projectId=${projectId}, slug=${project.slug}, groupCount=${groupCount}, keyCount=${keyCount})`)
      return result
    } catch (error) {
      this.logger.error(
        `project.getSecrets failed (projectId=${projectId}): ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      )
      throw error
    }
  }

  private async getProjectSlug(projectId: string): Promise<{ slug: string } | null> {
    return this.prisma.project.findUnique({
      where: { id: projectId },
      select: { slug: true },
    })
  }
}
