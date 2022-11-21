import kebabCase from 'lodash.kebabcase'

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

export const getLogInfos = (data) => {
  const e = new Error()
  const frame = e.stack.split('\n')[2]
  const fileName = frame.split(' ')[6].split('/').reverse()[0].split('.')[0]
  const functionName = frame.split(' ')[5]
  return {
    section: fileName,
    action: kebabCase(functionName),
    data,
  }
}
