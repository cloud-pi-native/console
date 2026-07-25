import type { ServiceInfos } from '@cpn-console/hooks'
import type { VaultConfig } from './vault.module-definition'
import { Inject, Injectable } from '@nestjs/common'
import { VAULT_CONFIG } from './vault.module-definition'

@Injectable()
export class VaultPluginService {
  constructor(
    @Inject(VAULT_CONFIG) private readonly vaultConfig: VaultConfig,
  ) {}

  infos(): ServiceInfos {
    return {
      name: 'vault',
      to: ({ project }) => {
        if (!this.vaultConfig.url) return undefined
        return new URL(`ui/vault/secrets/${project.slug}`, this.vaultConfig.url).toString()
      },
      title: 'Vault',
      imgSrc: '/img/vault.svg',
      description: 'Vault s\'intègre profondément avec les identités de confiance pour automatiser l\'accès aux secrets, aux données et aux systèmes',
    }
  }
}
