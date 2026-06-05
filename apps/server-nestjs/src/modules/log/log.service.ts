import type { logContract } from '@cpn-console/shared'
import type { Prisma } from '@prisma/client'
import { CleanLogSchema, exclude } from '@cpn-console/shared'
import { Inject, Injectable } from '@nestjs/common'
import { PrismaService } from '../infrastructure/database/prisma.service.js'

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

  async getLogs({ offset, limit, projectId, clean }: typeof logContract.getLogs.query._type) {
    const [total, logs] = await this.prisma.$transaction([
      this.prisma.log.count({ where: { projectId } }),
      this.prisma.log.findMany({
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
        where: { projectId },
      }),
    ])

    return {
      total,
      logs: clean
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
