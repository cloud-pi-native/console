import type { ServiceInfos } from '@cpn-console/hooks'
import type { ConfigType } from '@nestjs/config'
import { Inject, Injectable } from '@nestjs/common'
import { vaultConfigFactory } from '../../config/vault.config'

@Injectable()
export class VaultPluginService {
  constructor(
    @Inject(vaultConfigFactory.KEY) private readonly vaultConfig: ConfigType<typeof vaultConfigFactory>,
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
