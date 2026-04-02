import pino from 'pino'
import z from 'zod'

const envSchema = z.object({
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error', 'audit']).default('debug'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
})

const customLevels = {
  audit: 25,
}

export function getLoggerOptions() {
  const env = envSchema.parse(process.env)
  switch (env.NODE_ENV) {
    case 'development':
      return {
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
        level: env.LOG_LEVEL,
      }
    case 'production':
      return {
        customLevels,
        level: env.LOG_LEVEL,
      }
    default:
      return {
        level: 'silent',
      }
  }
}

export const logger = pino.pino({
  ...getLoggerOptions(),
  serializers: {
    err: pino.stdSerializers.err,
  },
})

export type Logger = typeof logger
