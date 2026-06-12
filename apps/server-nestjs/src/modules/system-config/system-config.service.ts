import { Injectable } from '@nestjs/common'
import { PrismaService } from '../infrastructure/database/prisma.service'

export type SystemConfigItem = {
  key: string
  value: string
  pluginName: string
}

@Injectable()
export class SystemConfigService {
  constructor(private readonly prisma: PrismaService) {}

  async listPluginsConfig(): Promise<SystemConfigItem[]> {
    const rows = await this.prisma.adminPlugin.findMany({
      select: { key: true, value: true, pluginName: true },
    })

    return rows.map((row) => ({
      key: row.key,
      value: String(row.value ?? ''),
      pluginName: row.pluginName,
    }))
  }

  async updatePluginsConfig(body: Record<string, Record<string, string>>): Promise<void> {
    const items = Object.entries(body).flatMap(([pluginName, values]) =>
      Object.entries(values).map(([key, value]) => ({ pluginName, key, value: String(value) })),
    )

    await this.prisma.$transaction(async (tx) => {
      for (const item of items) {
        await tx.adminPlugin.upsert({
          create: item,
          update: item,
          where: { pluginName_key: { pluginName: item.pluginName, key: item.key } },
        })
      }
    })
  }
}
