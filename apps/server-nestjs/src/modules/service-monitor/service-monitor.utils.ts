import { MonitorStatus } from '@cpn-console/shared'
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isProbeDetail(detail: unknown): detail is ProbeDetail {
  return isRecord(detail) && 'status' in detail && typeof detail.status === 'string'
}

export function fromHealthCheck(result: unknown): ProbeOutcome {
  const detail = isRecord(result) ? result[Object.keys(result)[0]] : undefined
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
