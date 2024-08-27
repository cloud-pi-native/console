import type { FastifyLoggerOptions, FastifyRequest, RawServerBase } from 'fastify'
import type { FastifyBaseLogger, PinoLoggerOptions } from 'fastify/types/logger.js'

export const loggerConf: Record<string, false | FastifyLoggerOptions<RawServerBase> & PinoLoggerOptions | FastifyBaseLogger> = {
  development: {
    transport: {
      target: 'pino-pretty',
      options: {
        translateTime: 'dd/mm/yyyy - HH:MM:ss Z',
        ignore: 'pid,hostname',
        colorize: true,
        singleLine: true,
      },
    },
  },
  production: {},
  test: false,
}

interface ReqLogsInput {
  req: FastifyRequest
  message: string
  infos?: Record<string, unknown>
  error?: Record<string, unknown> | string | Error
}

export function addReqLogs({ req, error, message, infos }: ReqLogsInput) {
  const logInfos = {
    description: message,
    infos,
  }

  if (error) {
    const errorInfos = {
      ...logInfos,
      error: {
        message: typeof error === 'string' ? error : error?.message || 'unexpected error',
        trace: error instanceof Error && error?.stack,
      },
    }
    req.log.error(errorInfos, 'processing request')
    return
  }

  req.log.info(logInfos, 'processing request')
}
