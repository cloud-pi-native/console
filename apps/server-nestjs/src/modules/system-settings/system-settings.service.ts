import type { SystemSetting } from '@cpn-console/shared'
import { Inject, Injectable } from '@nestjs/common'
import { PrismaService } from '../infrastructure/database/prisma.service'

@Injectable()
export class SystemSettingsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async list(key?: string): Promise<SystemSetting[]> {
    return this.prisma.systemSetting.findMany({ where: { key } })
  }

  async upsert(data: SystemSetting): Promise<SystemSetting> {
    return this.prisma.systemSetting.upsert({
      create: data,
      update: data,
      where: { key: data.key },
    })
  }
}
