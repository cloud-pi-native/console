import pino from 'pino'

export const logger = pino.pino({
  customLevels: {
    audit: 25,
  },
  level: 'info',
  browser: {
    asObject: true,
  },
  serializers: {
    err: pino.stdSerializers.errWithCause,
  },
})

export type Logger = typeof logger
