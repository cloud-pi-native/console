import type { ServiceInfos } from '@cpn-console/hooks'
import { DISABLED, ENABLED } from '@cpn-console/shared'
import { Inject, Injectable } from '@nestjs/common'
import { ConfigurationService } from '../infrastructure/configuration/configuration.service'
import { AUTO_SYNC_PLUGIN_KEY, SUSPENDED_PLUGIN_KEY } from './vault.constants'

@Injectable()
export class VaultPluginService {
  constructor(
    @Inject(ConfigurationService)
    private readonly config: ConfigurationService,
  ) {}

  infos(): ServiceInfos {
    return {
      name: 'vault',
      to: ({ project }) => {
        if (!this.config.vaultUrl) return undefined
        return new URL(`ui/vault/secrets/${project.slug}`, this.config.vaultUrl).toString()
      },
      title: 'Vault',
      imgSrc: '/img/vault.svg',
      description: 'Vault s\'intègre profondément avec les identités de confiance pour automatiser l\'accès aux secrets, aux données et aux systèmes',
      config: {
        global: [],
        project: [
          {
            kind: 'switch',
            key: SUSPENDED_PLUGIN_KEY,
            initialValue: ENABLED,
            permissions: {
              admin: { read: true, write: true },
              user: { read: true, write: true },
            },
            title: 'Suspendre le projet',
            value: ENABLED,
            description: 'Suspendre la synchronisation Vault pour ce projet',
          },
          {
            kind: 'switch',
            key: AUTO_SYNC_PLUGIN_KEY,
            initialValue: DISABLED,
            permissions: {
              admin: { read: true, write: true },
              user: { read: true, write: true },
            },
            title: 'Synchronisation automatique Vault',
            value: DISABLED,
            description: 'Synchroniser automatiquement le projet Vault',
          },
        ],
      },
    }
  }
}
