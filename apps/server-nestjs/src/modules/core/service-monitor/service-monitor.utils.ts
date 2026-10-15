import type { MonitorInfos } from '@cpn-console/shared'
import type { ServiceHealth } from './service-monitor.service'
import { MonitorStatus } from '@cpn-console/shared'
import { z } from 'zod'
import { ERROR_MESSAGE, PENDING_MESSAGE } from './service-monitor.constants'

export interface ProbeOutcome {
  status: MonitorStatus
  message: string
  cause?: unknown
}

const probeDetailSchema = z.object({
  status: z.string(),
  message: z.string().optional(),
  cause: z.unknown(),
})

export function fromHealthCheck(result: unknown, key: string): ProbeOutcome {
  const parsed = z.object({ [key]: probeDetailSchema }).safeParse(result)
  if (!parsed.success) {
    return { status: MonitorStatus.UNKNOW, message: ERROR_MESSAGE }
  }
  const detail = parsed.data[key]

  const up = detail.status === 'up'
  if (up) {
    return detail.cause !== undefined || detail.message !== undefined
      ? { status: detail.cause === undefined ? MonitorStatus.WARNING : MonitorStatus.UNKNOW, message: detail.message ?? MonitorStatus.WARNING }
      : { status: MonitorStatus.OK, message: MonitorStatus.OK }
  }
  return {
    status: MonitorStatus.ERROR,
    message: detail.message ?? ERROR_MESSAGE,
    cause: toCause(detail.cause ?? detail.message ?? ERROR_MESSAGE),
  }
}

export function pendingStatus(interval: number): MonitorInfos {
  return {
    interval,
    lastUpdateTimestamp: Date.now(),
    status: MonitorStatus.UNKNOW,
    message: PENDING_MESSAGE,
    cause: 'App just started',
  }
}

export function toCause(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause)
}

export function toServiceHealth({ cause, ...health }: ServiceHealth): ServiceHealth {
  return { ...health, ...(cause === undefined ? {} : { cause: toCause(cause) }) }
}

// MonitorInfos.cause is admin-only
export function toPublicServiceHealth({ cause, ...health }: ServiceHealth): ServiceHealth {
  return health
}
