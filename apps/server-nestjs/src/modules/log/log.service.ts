import type { AdminLogsQuery } from '@cpn-console/shared'
import type { Prisma } from '@prisma/client'
import { CleanLogSchema, exclude } from '@cpn-console/shared'
import { Inject, Injectable } from '@nestjs/common'
import { PrismaService } from '../infrastructure/database/prisma.service'
import { countLogs, listLogs } from './log-queries.utils'

/**
 * Shape of the `data` JSON column, aligned with the LogSchema contract in
 * `@cpn-console/shared` so the console can parse and display every entry.
 */
export interface LogData {
  /** Payload the action/event was invoked with (e.g. the full project). */
  args?: unknown
  /** Names of the services that reported a KO result. */
  failed?: boolean | string[]
  /** Per-service outcome, keyed by service name. */
  results?: Record<string, unknown>
  totalExecutionTime?: number
  messageResume?: string
  /** Extra keys are persisted as-is, except the sensitive ones stripped by addLog. */
  [key: string]: unknown
}

interface AddLogArgs {
  action: string
  data: LogData
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
        data: exclude(data, ['cluster', 'user', 'newCreds', 'apis', 'config']) as Prisma.InputJsonValue,
      },
    })
  }
}
