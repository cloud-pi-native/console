import type { ServiceInfos } from '@cpn-console/hooks'
import type { ConfigType } from '@nestjs/config'
import { Inject, Injectable } from '@nestjs/common'
import { vaultConfigFactory } from '../../config/vault.config'
import { StartActiveSpan } from '../infrastructure/telemetry/telemetry.decorator'
import { VaultClientService } from './vault-client.service'
import { VaultDatastoreService } from './vault-datastore.service'

@Injectable()
export class VaultPluginService {
  constructor(
    @Inject(vaultConfigFactory.KEY) private readonly vaultConfig: ConfigType<typeof vaultConfigFactory>,
    @Inject(VaultDatastoreService) private readonly datastore: VaultDatastoreService,
    @Inject(VaultClientService) private readonly client: VaultClientService,
  ) {}

  infos(): ServiceInfos {
    return {
      name: 'vault',
      to: ({ project }) => new URL(`ui/vault/secrets/${project.slug}`, this.vaultConfig.url).toString(),
      title: 'Vault',
      imgSrc: '/img/vault.svg',
      description: 'Vault s\'intègre profondément avec les identités de confiance pour automatiser l\'accès aux secrets, aux données et aux systèmes',
    }
  }

  @StartActiveSpan()
  async secrets(projectId: string): Promise<Record<string, string>> {
    const project = await this.datastore.getProject(projectId)
    if (!project) return {}
    return {
      '.spec.mount': project.slug,
      '.spec.vaultAuthRef': 'vault-auth',
    }
  }
}
