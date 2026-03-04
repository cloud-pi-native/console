import { Inject, Injectable, Logger } from '@nestjs/common'
import { ConfigurationService } from '@/cpin-module/infrastructure/configuration/configuration.service'
import { VaultClientService, type VaultSecret } from './vault-client.service'

@Injectable()
export class VaultService {
  private readonly logger = new Logger(VaultService.name)

  constructor(
    @Inject(VaultClientService) private readonly vaultClientService: VaultClientService,
    @Inject(ConfigurationService) private readonly configService: ConfigurationService,
  ) {
    this.logger.log('VaultService initialized with config:', configService)
  }

  async getProjectValues(projectId: string): Promise<Record<string, any>> {
    const path = this.configService.projectRootPath
      ? `${this.configService.projectRootPath}/${projectId}`
      : projectId
    const secret = await this.vaultClientService.read(path)
    return secret?.data || {}
  }

  async read(path: string): Promise<VaultSecret | undefined> {
    return await this.vaultClientService.read(path)
  }

  async write(data: any, path: string): Promise<void> {
    await this.vaultClientService.write(data, path)
  }

  async destroy(path: string): Promise<void> {
    await this.vaultClientService.destroy(path)
  }
}
