import { pino, stdSerializers } from 'pino'

export const logger = pino({
  customLevels: {
    audit: 25,
  },
  level: 'info',
  browser: {
    asObject: true,
  },
  serializers: {
    err: stdSerializers.errWithCause,
  },
})

export type Logger = typeof logger
