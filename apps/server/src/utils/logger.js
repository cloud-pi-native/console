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

export const addReqLogs = ({ req, error, description, extras }) => {
  const e = new Error()
  const frame = e.stack.split('\n')[2]

  let logInfos = {
    file: frame.split(' ')[6].split(':')[0].split('src/')[1],
    function: frame.split(' ')[5].split('.')[1],
    requestorId: req.session?.user?.id,
    requestorGroups: req.session?.user?.groups,
    description,
  }

  if (extras) {
    logInfos = {
      ...logInfos,
      ...extras,
    }
  }

  if (error) {
    req.log.error({
      ...logInfos,
      error: {
        message: error?.message,
        trace: error?.trace,
      },
    },
    'request processing')
    return
  }

  req.log.info(logInfos, 'request processing')
}
