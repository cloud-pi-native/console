import type { SystemSetting } from '@prisma/client'
import type { SystemSettingDto } from './dto/system-setting.dto'
import { Inject, Injectable } from '@nestjs/common'
import { PrismaService } from '../../cpin-module/infrastructure/database/prisma.service'

@Injectable()
export class SystemSettingsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async list(key?: string): Promise<SystemSetting[]> {
    if (key === undefined) return this.prisma.systemSetting.findMany()
    return this.prisma.systemSetting.findMany({ where: { key } })
  }

  async upsert(key: string, systemSetting: SystemSettingDto): Promise<SystemSetting> {
    return this.prisma.systemSetting.upsert({
      create: { key, ...systemSetting },
      update: systemSetting,
      where: { key },
    })
  }
}
