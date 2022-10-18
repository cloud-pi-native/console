export const isDev = process.env.NODE_ENV === 'development'

export const isTest = process.env.NODE_ENV === 'test'

export const isCI = process.env.CI === 'true'

export const isProd = !isDev && !isTest
