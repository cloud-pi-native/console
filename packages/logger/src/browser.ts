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
    err: pino.stdSerializers.err,
    error: pino.stdSerializers.err,
  },
})

export type Logger = typeof logger
