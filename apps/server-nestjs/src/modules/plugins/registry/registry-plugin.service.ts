import type { ServiceInfos } from '@cpn-console/hooks'
import type { Cache } from 'cache-manager'
import { DISABLED } from '@cpn-console/shared'
import { CACHE_MANAGER } from '@nestjs/cache-manager'
import { Inject, Injectable, Logger } from '@nestjs/common'
import { ConfigurationService } from '../../infrastructure/configuration/configuration.service'
import { RegistryClientService } from './registry-client.service'
import { RegistryDatastoreService } from './registry-datastore.service'
import { createProjectSlugCacheKey } from './registry.utils'

@Injectable()
export class RegistryPluginService {
  private readonly logger = new Logger(RegistryPluginService.name)

  constructor(
    @Inject(ConfigurationService)
    private readonly config: ConfigurationService,
    @Inject(RegistryDatastoreService)
    private readonly registryDatastore: RegistryDatastoreService,
    @Inject(RegistryClientService)
    private readonly registryClient: RegistryClientService,
    @Inject(CACHE_MANAGER)
    private readonly cache: Cache,
  ) {}

  private async resolveProjectSlug(projectId: string): Promise<string | undefined> {
    const cacheKey = createProjectSlugCacheKey(projectId)
    const cached = await this.cache.get<string | null>(cacheKey)
    if (cached !== undefined) return cached ?? undefined

    const project = await this.registryDatastore.getProject(projectId)
    const slug = project?.slug ?? null
    await this.cache.set(cacheKey, slug, this.config.harborProjectSlugCacheTtlMs)
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

  private resolveHarborProjectUrl(harborProjectId: number): string | undefined {
    if (!this.config.harborUrl) return undefined
    return new URL(`harbor/projects/${harborProjectId}/`, this.config.harborUrl).toString()
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
}
