import type { PluginsUpdateBody } from '@cpn-console/shared'
import { BadRequestException, Inject, Injectable } from '@nestjs/common'
import { PrismaService } from '../../infrastructure/database/prisma.service'
import { buildEditStrippers, populateServiceManifest } from '../plugin/plugin-config.utils'
import { PluginService } from '../plugin/plugin.service'
import { listAdminPluginConfig, upsertAdminPluginConfig } from './system-config-queries.utils'

@Injectable()
export class SystemConfigService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(PluginService) private readonly plugins: PluginService,
  ) {}

  async list() {
    const globalConfig = await listAdminPluginConfig(this.prisma)
    return this.plugins.manifests().map((service) => {
      const { name, title, imgSrc, description } = service
      const manifest = populateServiceManifest({
        service,
        data: { global: globalConfig },
        permissionTarget: 'admin',
        select: { global: true },
      })
      return { imgSrc, title, name, manifest: manifest.global ?? [], description }
    }).filter(plugin => plugin.manifest.length > 0)
  }

  async update(body: PluginsUpdateBody) {
    const parsedData = buildEditStrippers(this.plugins.manifests()).global.safeParse(body)
    if (!parsedData.success) {
      throw new BadRequestException(parsedData.error.message)
    }
    await this.prisma.$transaction(async (tx) => {
      for (const [pluginName, values] of Object.entries(parsedData.data)) {
        for (const [key, value] of Object.entries(values)) {
          await upsertAdminPluginConfig(tx, pluginName, key, String(value))
        }
      }
    })
  }
}
