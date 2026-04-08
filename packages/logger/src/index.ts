import type { LoggerOptions } from 'pino'
import { pino, stdSerializers } from 'pino'
import z from 'zod'

const envSchema = z.object({
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error', 'audit']).default('debug'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
})

export type Env = z.infer<typeof envSchema>['NODE_ENV']
export type LogLevel = z.infer<typeof envSchema>['LOG_LEVEL']
const customLevels = {
  audit: 25,
}

const redact: LoggerOptions['redact'] = {
  paths: [
    'password',
    '*.password',
    'passwd',
    '*.passwd',
    'secret',
    '*.secret',
    'token',
    '*.token',
    'access_token',
    '*.access_token',
    'refresh_token',
    '*.refresh_token',
    'client_secret',
    '*.client_secret',
    'authorization',
    '*.authorization',
    'headers.authorization',
    'headers.cookie',
    'req.headers.authorization',
    'req.headers.cookie',
    'request.headers.authorization',
    'request.headers.cookie',
  ],
  remove: true,
}

export function getLoggerOptions(env: Env, level: LogLevel): LoggerOptions {
  switch (env) {
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
        level,
        redact,
        serializers: {
          err: stdSerializers.errWithCause,
        },
      }
    case 'production':
      return {
        customLevels,
        level,
        redact,
        serializers: {
          err: stdSerializers.errWithCause,
        },
      }
    default:
      return {
        level: 'silent',
      }
  }
}

export function getLoggerOptionsFromEnv(): LoggerOptions {
  const env = envSchema.parse(process.env)
  return getLoggerOptions(env.NODE_ENV, env.LOG_LEVEL)
}

export const logger = pino(getLoggerOptionsFromEnv())

export type Logger = typeof logger
