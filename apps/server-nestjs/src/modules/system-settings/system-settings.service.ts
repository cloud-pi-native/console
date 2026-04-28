import { SystemSettingSchema } from '@cpn-console/shared'
import { Body } from '@nestjs/common'
import type { SystemSetting } from '@cpn-console/shared'
import { Inject, Injectable, UsePipes } from '@nestjs/common'
import { PrismaService } from '../infrastructure/database/prisma.service'
import { ZodValidationPipe } from '../infrastructure/pipe/zod-validation.pipe.js'

@Injectable()
export class SystemSettingsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async list(key?: string): Promise<SystemSetting[]> {
    return this.prisma.systemSetting.findMany({ where: { key } })
  }

  @UsePipes(new ZodValidationPipe(SystemSettingSchema))
  async upsert(@Body(new ZodValidationPipe(SystemSettingSchema)) data: SystemSetting): Promise<SystemSetting> {
    return this.prisma.systemSetting.upsert({
      create: data,
      update: data,
      where: { key: data.key },
    })
  }
}
