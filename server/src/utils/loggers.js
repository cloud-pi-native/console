import winston from 'winston'
import morgan from 'morgan'
import { getJSDateFromUtcIso } from './date.js'
import kebabCase from 'lodash.kebabcase'
import { isDev, isTest, isProd } from './env.js'

const { format } = winston
const { colorize, combine, timestamp, label, printf } = format

const TECH_LABEL = 'tech'
const APP_LABEL = 'app'
const HTTP_LABEL = 'http'

const getLevel = () => {
  if (isDev) {
    return 'debug'
  }
  if (isTest) {
    return 'crit'
  }
  return 'info'
}

const level = getLevel()

const logOptions = {
  console: {
    level,
    json: false,
    colorize: !isProd,
  },
}

const getProperObjectFromError = error => {
  if (error == null) {
    return '<empty error>'
  }
  return Object
    .getOwnPropertyNames(error)
    .reduce((acc, key) => ({
      ...acc,
      [key]: error[key],
    }),
    Object.create(null))
}

const getProperObjectFromDate = message => {
  return Object
    .getOwnPropertyNames(message)
    .reduce((acc, key) => {
      let value = message[key]
      if (['begin', 'end', 'date', 'dateTime'].includes(key)) {
        const newkey = key + 'Str'
        acc = {
          ...acc,
          [newkey]: `__${value}__`,
        }
        const datetimevalue = getJSDateFromUtcIso(value)
        if (datetimevalue) {
          value = datetimevalue
        }
      }
      return {
        ...acc,
        [key]: value,
      }
    }, Object.create(null))
}

const getProperObject = message => {
  if (message == null) {
    return { default: '<empty message>' }
  }
  if (typeof message === 'string') {
    return { default: message }
  }
  if (message instanceof Error) {
    return getProperObjectFromError(message)
  }
  if ('error' in message) {
    message.error = getProperObjectFromError(message.error)
  }
  return getProperObjectFromDate(message)
}

const logFormat = printf(({ level, message, label, timestamp }) => {
  return `${timestamp} [${label}] ${level}: ${typeof message === 'object' ? JSON.stringify(getProperObject(message), null, 2, ' ') : message}`
})

const logJsonFormat = printf(({ label, level, message, timestamp }) => {
  const content = getProperObject(message)
  return JSON.stringify({
    content,
    meta: {
      level,
      label,
      timestamp,
    },
  })
})

const createWinstonLogger = (labelName, _printColor) => {
  const combineArgs = [
    label({ label: labelName }),
    timestamp(),
  ]
  if (!isProd) {
    combineArgs.push(colorize())
    combineArgs.push(logFormat)
  } else {
    combineArgs.push(logJsonFormat)
  }
  return winston.createLogger({
    format: combine(...combineArgs),
    transports: [
      new winston.transports.Console(logOptions.console),
    ],
  })
}

export const techLogger = createWinstonLogger(TECH_LABEL)
export const appLogger = createWinstonLogger(APP_LABEL)
export const morganLogger = createWinstonLogger(HTTP_LABEL)

const morganLoggerStream = {
  write: function (message, _encoding) {
    morganLogger.info(message)
  },
}

export const logHttp = morgan('combined', { stream: morganLoggerStream })

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