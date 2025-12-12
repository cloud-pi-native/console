import type { FastifyBaseLogger, FastifyLogFn, PinoLoggerOptions } from 'fastify/types/logger'
import type { XOR } from '@cpn-console/shared'
import { logger as customLogger } from '@old-server/app'

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
    level: process.env.LOG_LEVEL ?? 'debug',
  },
  production: {
    customLevels,
    level: process.env.LOG_LEVEL ?? 'audit',
  },
  test: {
    level: 'silent',
  },
}

type LoggerType = 'info' | 'warn' | 'error' | 'fatal' | 'trace' | 'debug' | 'audit' | undefined
const loggerWrapper = {
  level: '',
  child: () => loggerWrapper,
  silent: () => {},
  audit: (msg: string | unknown) => console.log(msg),
  info: (msg: string | unknown) => console.log(msg),
  warn: (msg: string | unknown) => console.warn(msg),
  error: (msg: string | unknown) => console.error(msg),
  fatal: (msg: string | unknown) => console.error(msg),
  trace: (msg: string | unknown) => console.trace(msg),
  debug: (msg: string | unknown) => console.debug(msg),
}

export function log(
  type: LoggerType,
  {
    reqId,
    userId,
    tokenId,
    message,
    error,
    infos,
  }: {
    reqId?: string
    userId?: string
    tokenId?: string
    infos?: Record<string, unknown>
  } & XOR<{ message: string }, { error: Record<string, unknown> | string | Error }>,
) {
  const logger = customLogger || loggerWrapper

  const logInfos = {
    message,
    infos,
    reqId,
    userId,
    tokenId,
  }

  if (error) {
    const errorInfos = {
      ...logInfos,
      error: {
        message: typeof error === 'string' ? error : error?.message || 'unexpected error',
        trace: error instanceof Error && error?.stack,
      },
    }
    logger.error({ ...errorInfos })
    return
  }
  logger[type || 'info']({ reqId, userId, logInfos })
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
