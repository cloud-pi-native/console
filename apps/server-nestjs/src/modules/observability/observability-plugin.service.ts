import type { ServiceInfos } from '@cpn-console/hooks'
import type { ConfigType } from '@nestjs/config'
import { ENABLED } from '@cpn-console/shared'
import { Inject, Injectable } from '@nestjs/common'
import { observabilityConfigFactory } from '../../config/observability.config'
import { ObservabilityDatastoreService } from './observability-datastore.service'
import { isProdStage } from './observability.utils'
import { ENABLED_PLUGIN_KEY, INSTANCES_PLUGIN_KEY } from './observability.constants'

@Injectable()
export class ObservabilityPluginService {
  constructor(
    @Inject(observabilityConfigFactory.KEY) private readonly observabilityConfig: ConfigType<typeof observabilityConfigFactory>,
    @Inject(ObservabilityDatastoreService) private readonly observabilityDatastore: ObservabilityDatastoreService,
  ) {}

  async infos(projectId: string): Promise<ServiceInfos> {
    const project = await this.observabilityDatastore.getProjectForInfos(projectId)
    if (!project) {
      throw new Error('Project not found')
    }
    const hasProd = project.environments.some(e => isProdStage(e.stage))
    const hasHprod = project.environments.some(e => !isProdStage(e.stage))
    const urls: Array<{ to: string, title?: string, description: string }> = []
    if (hasHprod) {
      urls.push({
        to: `${this.observabilityConfig.grafanaUrl}/hprod-${project.slug}`,
        description: 'Hors production',
      })
    }
    if (hasProd) {
      urls.push({
        to: `${this.observabilityConfig.grafanaUrl}/prod-${project.slug}`,
        description: 'Production',
      })
    }

    return {
      name: 'observability',
      to: () => urls,
      title: 'Grafana',
      imgSrc: '/img/grafana.png',
      description: 'Grafana est un outil de visualisation de métriques et de logs',
      config: {
        global: [{
          kind: 'switch',
          key: ENABLED_PLUGIN_KEY,
          initialValue: ENABLED,
          permissions: {
            admin: { read: true, write: true },
            user: { read: true, write: false },
          },
          title: 'Activer le plugin',
          value: ENABLED,
          description: 'Activer le plugin',
        }],
        project: [{
          kind: 'text',
          key: INSTANCES_PLUGIN_KEY,
          permissions: {
            admin: { read: false, write: false },
            user: { read: false, write: false },
          },
          title: 'Instances actives',
          value: '',
          description: '',
        }],
      },
    } satisfies ServiceInfos
  }
}
