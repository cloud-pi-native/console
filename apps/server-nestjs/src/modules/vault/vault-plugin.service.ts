import type { ServiceInfos } from '@cpn-console/hooks'
import type { VaultConfig } from '../../config/vault'
import { Inject, Injectable } from '@nestjs/common'
import vaultConfigFactory from '../../config/vault'

@Injectable()
export class VaultPluginService {
  constructor(
    @Inject(vaultConfigFactory.KEY) private readonly config: VaultConfig,
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
    }
  }
}
