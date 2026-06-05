import type { AdminLogsQuery } from '@cpn-console/shared'
import type { Prisma } from '@prisma/client'
import { CleanLogSchema, exclude } from '@cpn-console/shared'
import { Inject, Injectable } from '@nestjs/common'
import { PrismaService } from '../infrastructure/database/prisma.service'

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
    const [total, logs] = await this.prisma.$transaction([
      this.prisma.log.count({ where: { projectId: params.projectId } }),
      this.prisma.log.findMany({
        orderBy: { createdAt: 'desc' },
        skip: params.offset,
        take: params.limit,
        where: { projectId: params.projectId },
      }),
    ])

    return {
      total,
      logs: params.clean
        ? logs.map(log => CleanLogSchema.parse(log))
        : logs,
    }
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
        data: exclude<Prisma.InputJsonValue>(data, ['cluster', 'user', 'newCreds', 'apis']),
      },
    })
  }
}
