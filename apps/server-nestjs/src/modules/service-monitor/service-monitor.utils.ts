import { MonitorStatus } from '@cpn-console/shared'
import { isRecord } from '../../utils/record.utils'
import { ERROR_MESSAGE } from './service-monitor.constants'

export interface ProbeOutcome {
  status: MonitorStatus
  message: string
  cause?: unknown
}

interface ProbeDetail {
  status: string
  message?: string
}

function isProbeDetail(detail: unknown): detail is ProbeDetail {
  return isRecord(detail) && 'status' in detail && typeof detail.status === 'string'
}

export function fromHealthCheck(result: unknown, key: string): ProbeOutcome {
  const detail = isRecord(result) ? result[key] : undefined
  if (!isProbeDetail(detail)) {
    return { status: MonitorStatus.UNKNOW, message: ERROR_MESSAGE }
  }

  const up = detail.status === 'up'
  return {
    status: up ? MonitorStatus.OK : MonitorStatus.ERROR,
    message: up ? MonitorStatus.OK : detail.message ?? ERROR_MESSAGE,
    ...(up ? {} : { cause: detail.message ?? ERROR_MESSAGE }),
  }
}

export function toCause(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause)
}
