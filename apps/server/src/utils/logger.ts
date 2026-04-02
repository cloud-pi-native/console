import type { FastifyBaseLogger, FastifyLogFn } from 'fastify/types/logger.js'
import { loggerConfiguration } from '@cpn-console/logger'

export const loggerConf = loggerConfiguration

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
