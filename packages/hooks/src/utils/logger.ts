import type { FastifyBaseLogger, FastifyLogFn } from 'fastify'

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

let customLogger: CustomLogger

export function setLogger(logger?: CustomLogger) {
  customLogger = logger || {
    level: '',
    child: () => customLogger,
    silent: () => {},
    audit: (msg: string | unknown) => console.log(msg),
    info: (msg: string | unknown) => console.log(msg),
    warn: (msg: string | unknown) => console.warn(msg),
    error: (msg: string | unknown) => console.error(msg),
    fatal: (msg: string | unknown) => console.error(msg),
    trace: (msg: string | unknown) => console.trace(msg),
    debug: (msg: string | unknown) => console.debug(msg),
  }
}

export function getLogger() {
  return customLogger
}

export const logger = getLogger()

export function parseError(error: unknown) {
  // @ts-ignore
  if (error?.config?.auth?.username) error.config.auth.username = 'MASKED'
  // @ts-ignore
  if (error?.config?.auth?.password) error.config.auth.password = 'MASKED'
  // @ts-ignore
  if (error?.config?.headers) error.config.headers = 'MASKED'
  if (error instanceof Error) {
    Object.defineProperty(error, 'stack', {
      enumerable: true,
    })
    Object.defineProperty(error, 'message', {
      enumerable: true,
    })
  }
  try {
    return JSON.stringify(error)
  } catch (parseError) {
    logger.error(parseError)
    if (error instanceof Error && error.stack) {
      return `Can't parse error \n${error.stack}`
    }
    return error
  }
}
