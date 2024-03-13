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
  req: FastifyRequest;
  error?: string | Error;
  description: string;
  extras?: Record<string, string>
}

export const addReqLogs = ({ req, error, description, extras }: ReqLogsInput) => {
  const e = new Error()
  const frame = e.stack?.split('\n')[2]

  const logInfos = {
    file: frame?.split(' ')[6].split(':')[0].split('src/')[1],
    function: frame?.split(' ')[5].split('.')[1],
    requestorId: req.session?.user?.id,
    requestorGroups: req.session?.user?.groups,
    description,
    ...extras,
  }

  if (error) {
    req.log.error({
      ...logInfos,
      error: {
        message: typeof error === 'string' ? error : error?.message,
        trace: error instanceof Error && error?.stack,
      },
    },
    'request processing')
    return
  }

  req.log.info(logInfos, 'request processing')
}
