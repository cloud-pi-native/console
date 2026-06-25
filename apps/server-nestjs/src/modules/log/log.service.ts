import type { AdminLogsQuery } from '@cpn-console/shared'
import type { Prisma } from '@prisma/client'
import { CleanLogSchema, exclude } from '@cpn-console/shared'
import { Inject, Injectable } from '@nestjs/common'
import { PrismaService } from '../infrastructure/database/prisma.service'
import { countLogs, listLogs } from './log-queries.utils'

interface AddLogArgs {
  action: string
  data: Prisma.InputJsonValue
  userId?: string | null
  requestId?: string | null
  projectId?: string | null
}

@Injectable()
export class LogService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  async getLogs(params: AdminLogsQuery) {
    const [total, logs] = await this.getLogsWithCount(params.projectId, params.offset, params.limit)

    return {
      total,
      logs: params.clean
        ? logs.map(log => CleanLogSchema.parse(log))
        : logs,
    }
  }

  async getLogsWithCount(projectId: string | null | undefined, offset: number, limit: number) {
    return this.prisma.$transaction([
      countLogs(this.prisma, projectId),
      listLogs(this.prisma, projectId, offset, limit),
    ])
  }

  async addLog({
    action,
    data,
    userId = null,
    requestId = null,
    projectId = null,
  }: AddLogArgs) {
    return this.prisma.log.create({
      data: {
        action,
        userId,
        requestId,
        projectId,
        data: exclude<Prisma.InputJsonValue>(data, ['cluster', 'user', 'newCreds', 'apis', 'config']),
      },
    })
  }
}
