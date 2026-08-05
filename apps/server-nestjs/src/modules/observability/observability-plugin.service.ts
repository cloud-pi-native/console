import type { ServiceInfos } from '@cpn-console/hooks'
import type { ConfigType } from '@nestjs/config'
import { ENABLED } from '@cpn-console/shared'
import { Inject, Injectable } from '@nestjs/common'
import { observabilityConfigFactory } from '../../config/observability.config'
import { ENABLED_PLUGIN_KEY, INSTANCES_PLUGIN_KEY } from './observability.constants'

@Injectable()
export class ObservabilityPluginService {
  constructor(
    @Inject(observabilityConfigFactory.KEY) private readonly observabilityConfig: ConfigType<typeof observabilityConfigFactory>,
  ) {}

  infos(): ServiceInfos {
    return {
      name: 'observability',
      to: ({ store, project }) => {
        const params = {
          slug: project.slug,
        }
        const urls: Array<{ to: string, title?: string, description: string }> = []
        const instances = store.observability?.instances?.split(',') ?? []
        if (instances.includes('hprod')) {
          urls.push({
            to: `${this.observabilityConfig.grafanaUrl}/hprod-${params.slug}`,
            description: 'Hors production',
          })
        }
        if (instances.includes('prod')) {
          urls.push({
            to: `${this.observabilityConfig.grafanaUrl}/prod-${params.slug}`,
            description: 'Production',
          })
        }
        return urls
      },
      title: 'Grafana',
      imgSrc: '/img/grafana.svg',
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
    } as const satisfies ServiceInfos
  }
}
