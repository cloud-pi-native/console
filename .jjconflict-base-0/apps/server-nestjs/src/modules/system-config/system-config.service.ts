import type { PluginsUpdateBody } from '@cpn-console/shared'
import type { PrismaService } from '../infrastructure/database/prisma.service'
import { editStrippers, populatePluginManifests, servicesInfos } from '@cpn-console/hooks'
import { BadRequestException, Injectable } from '@nestjs/common'

@Injectable()
export class SystemConfigService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    const globalConfig = await this.prisma.adminPlugin.findMany({
      select: { key: true, value: true, pluginName: true },
    })

    return Object.values(servicesInfos).map(({ name, title, imgSrc, description }) => {
      const manifest = populatePluginManifests({
        data: { global: globalConfig },
        permissionTarget: 'admin',
        pluginName: name,
        select: { global: true, project: false },
      })
      return { imgSrc, title, name, manifest: manifest.global ?? [], description }
    }).filter(plugin => plugin.manifest.length > 0)
  }

  async update(body: PluginsUpdateBody) {
    const parsedData = editStrippers.global.safeParse(body)
    if (!parsedData.success) {
      throw new BadRequestException(parsedData.error.message)
    }

    const records = Object.entries(parsedData.data)
      .flatMap(([pluginName, values]: [string, Record<string, string>]) => Object.entries(values)
        .map(([key, value]) => ({ pluginName, key, value: String(value) })))

    await this.prisma.$transaction(async (tx) => {
      for (const { pluginName, key, value } of records) {
        await tx.adminPlugin.upsert({
          create: { pluginName, key, value },
          update: { key, value, pluginName },
          where: { pluginName_key: { pluginName, key } },
        })
      }
    })
  }
}
