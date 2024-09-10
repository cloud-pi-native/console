import type { FastifyRequest } from 'fastify'
import type { FastifyBaseLogger, FastifyLogFn, PinoLoggerOptions } from 'fastify/types/logger.js'

export const customLevels = {
  audit: 25,
}

export const loggerConf: Record<string, PinoLoggerOptions> = {
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
    customLevels,
    level: process.env.LOG_LEVEL ?? 'audit',
  },
  production: {
    customLevels,
    level: process.env.LOG_LEVEL ?? 'audit',
  },
  test: {
    level: 'silent',
  },
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

export interface CustomLogger extends FastifyBaseLogger {
  /**
   * Log at `'audit'` level the given msg. If the first argument is an object, all its properties will be included in the JSON line.
   * If more args follows `msg`, these will be used to format `msg` using `util.format`.
   *
   * @typeParam T: the interface of the object being serialized. Default is object.
   * @param obj: object to be serialized
   * @param msg: the log message to write
   * @param ...args: format string values when `msg` is a format string
   */
  audit: FastifyLogFn
}
