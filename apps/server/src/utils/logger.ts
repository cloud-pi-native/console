import { FastifyRequest } from 'fastify'

export const loggerConf = {
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
  production: true,
  test: false,
}

interface ReqLogsInput {
  req: FastifyRequest
  message: string
  infos?: Record<string, unknown>
  error?: Record<string, unknown> | string | Error
}

export const addReqLogs = ({ req, error, message, infos }: ReqLogsInput) => {
  const logInfos = {
    description: message,
    reqId: req.id,
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
