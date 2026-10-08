import type { ServiceInfos } from '@cpn-console/hooks'
import type { ConfigType } from '@nestjs/config'
import type { Cache } from 'cache-manager'
import { specificallyEnabled } from '@cpn-console/hooks'
import { DISABLED } from '@cpn-console/shared'
import { CACHE_MANAGER } from '@nestjs/cache-manager'
import { Inject, Injectable, Logger } from '@nestjs/common'
import { harborConfigFactory } from '../../config/harbor.config'
import { hasEntries } from '../../utils/record.utils'
import { VaultClientService } from '../vault/vault-client.service'
import { RegistryClientService } from './registry-client.service'
import { RegistryDatastoreService } from './registry-datastore.service'
import { PLUGIN_NAME, REGISTRY_CONFIG_KEY_PUBLISH_PROJECT_ROBOT } from './registry.constants'
import { createProjectSlugCacheKey } from './registry.utils'

@Injectable()
export class RegistryPluginService {
  private readonly logger = new Logger(RegistryPluginService.name)

  constructor(
    @Inject(harborConfigFactory.KEY)
    private readonly harborConfig: ConfigType<typeof harborConfigFactory>,
    @Inject(RegistryDatastoreService)
    private readonly datastore: RegistryDatastoreService,
    @Inject(RegistryClientService)
    private readonly registryClient: RegistryClientService,
    @Inject(CACHE_MANAGER)
    private readonly cache: Cache,
    @Inject(VaultClientService) private readonly vault: VaultClientService,
  ) {}

  private async resolveProjectSlug(projectId: string): Promise<string | undefined> {
    const cacheKey = createProjectSlugCacheKey(projectId)
    const cached = await this.cache.get<string | null>(cacheKey)
    if (cached !== undefined) return cached ?? undefined

    const project = await this.datastore.getProject(projectId)
    const slug = project?.slug ?? null
    await this.cache.set(cacheKey, slug, this.harborConfig.projectSlugCacheTtlMs)
    return slug ?? undefined
  }

  private async resolveHarborProjectId(projectSlug: string): Promise<number | undefined> {
    try {
      const harborProject = await this.registryClient.getProjectByName(projectSlug)
      const harborProjectId = Number(harborProject.data?.project_id)
      if (harborProject.status !== 200 || !Number.isFinite(harborProjectId)) {
        return undefined
      }
      this.logger.log(`Successfully resolve harbor project id for project slug ${projectSlug}: ${harborProjectId}`)
      return harborProjectId
    } catch (error) {
      this.logger.error(`Failed to resolve harbor project id for project slug ${projectSlug}: ${error}`)
      return undefined
    }
  }

  private resolveHarborProjectUrl(harborProjectId: number): string {
    return new URL(`harbor/projects/${harborProjectId}/`, this.harborConfig.url).toString()
  }

  private async resolveProjectUrl(projectId: string): Promise<string | undefined> {
    const projectSlug = await this.resolveProjectSlug(projectId)
    if (!projectSlug) {
      return undefined
    }

    const harborProjectId = await this.resolveHarborProjectId(projectSlug)
    if (harborProjectId === undefined) {
      return undefined
    }

    return this.resolveHarborProjectUrl(harborProjectId)
  }

  async infos(projectId: string): Promise<ServiceInfos> {
    const quotaDescription = '-1 -> illimité, sinon 100MB / 1.2GB (unités : B, KB, MB, GB, TB)), max 1024TB'
    const projectUrl = await this.resolveProjectUrl(projectId)
    if (!projectUrl) {
      throw new Error('Project not found')
    }

    return {
      name: 'registry',
      to: () => projectUrl,
      title: 'Harbor',
      imgSrc: '/img/harbor.svg',
      description: 'Harbor stocke, analyse et distribue vos images de conteneurs',
      config: {
        project: [{
          permissions: {
            admin: { read: false, write: false },
            user: { read: false, write: false },
          },
          key: 'projectId',
          kind: 'text',
          title: 'Num du projet Harbor',
          value: '',
        }, {
          kind: 'switch',
          key: 'publishProjectRobot',
          initialValue: DISABLED,
          title: 'Publication du robot projet',
          description: 'Activer le robot de projet (read-only) et afficher ses identifiants aux utilisateurs',
          permissions: {
            admin: { read: true, write: true },
            user: { read: true, write: false },
          },
          value: DISABLED,
        }, {
          kind: 'text',
          permissions: {
            admin: { read: true, write: true },
            user: { read: true, write: false },
          },
          key: 'quotaHardLimit',
          title: 'Quota',
          value: '',
          description: `Stockage limite (vide utilisation du paramètre global, ${quotaDescription}`,
          placeholder: '',
        }],
        global: [{
          kind: 'switch',
          key: 'publishProjectRobot',
          initialValue: DISABLED,
          title: 'Publication du robot RO aux projets',
          description: 'Définit le comportement en l\'absence de ce paramétrage au niveau projet',
          permissions: {
            admin: { read: true, write: true },
            user: { read: true, write: false },
          },
          value: DISABLED,
        }, {
          kind: 'text',
          permissions: {
            admin: { read: true, write: true },
            user: { read: true, write: false },
          },
          key: 'quotaHardLimit',
          title: 'Quota par défaut',
          value: '-1',
          description: `Stockage limite par projet (${quotaDescription}`,
          placeholder: '-1',
        }],
      },
    } as const satisfies ServiceInfos
  }

  async secrets(projectId: string): Promise<Record<string, string>> {
    const project = await this.datastore.getProject(projectId)
    if (!project) return {}
    const harborUrl = new URL(`${project.slug}/`, this.harborConfig.url)
    const registryBasePath = `${harborUrl.host}${harborUrl.pathname}`
    const publishConfig = await this.datastore.getAdminPluginConfig(PLUGIN_NAME, REGISTRY_CONFIG_KEY_PUBLISH_PROJECT_ROBOT) ?? undefined
    const projectPublishConfig = project.plugins?.find(p => p.key === REGISTRY_CONFIG_KEY_PUBLISH_PROJECT_ROBOT)?.value
    // Current writer's resolution (syncProject): project explicit > admin, only when the project sets nothing.
    const projectRobotEnabled = specificallyEnabled(projectPublishConfig)
      ?? (projectPublishConfig === undefined && specificallyEnabled(publishConfig))
    if (!projectRobotEnabled) {
      return { 'Registry base path': registryBasePath }
    }
    const robot = await this.vault.readRegistrySecrets(project.slug)
    if (!hasEntries(robot)) {
      return { 'Registry base path': registryBasePath, '/!\\': 'Vous n\'avez pas de robot de lecture veuillez reprovisionner' }
    }
    return {
      'Registry base path': registryBasePath,
      ...robot,
    }
  }
}
