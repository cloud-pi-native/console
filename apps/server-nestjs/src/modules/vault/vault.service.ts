import { Inject, Injectable, Logger } from '@nestjs/common'
import { ConfigurationService } from '@/cpin-module/infrastructure/configuration/configuration.service'
import { VaultClientService } from './vault-client.service'

@Injectable()
export class VaultService {
  private readonly logger = new Logger(VaultService.name)

  constructor(
    @Inject(VaultClientService) private readonly vaultClient: VaultClientService,
    @Inject(ConfigurationService) private readonly config: ConfigurationService,
  ) {
    this.logger.log('VaultService initialized with config:', config)
  }

  async getProjectValues(projectId: string): Promise<Record<string, any>> {
    const path = this.config.projectRootPath
      ? `${this.config.projectRootPath}/${projectId}`
      : projectId
    const values = await this.vaultClient.read(path)
    return values || {}
  }

  async read(path: string): Promise<any> {
    return await this.vaultClient.read(path)
  }

  async write(data: any, path: string): Promise<void> {
    await this.vaultClient.write(data, path)
  }

  async destroy(path: string): Promise<void> {
    await this.vaultClient.destroy(path)
  }
}
