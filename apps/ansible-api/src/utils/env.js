export const isDev = process.env.NODE_ENV === 'development'

export const isTest = process.env.NODE_ENV === 'test'

export const isProd = process.env.NODE_ENV === 'production'

export const isCI = process.env.CI === 'true'

export const playbookDir = process.env.PLAYBOOK_DIR?.endsWith('/')
  ? process.env.PLAYBOOK_DIR
  : process.env.PLAYBOOK_DIR + '/'

export const configDir = process.env.CONFIG_DIR?.endsWith('/')
  ? process.env.CONFIG_DIR
  : process.env.CONFIG_DIR + '/'

export const port = process.env.ANSIBLE_PORT
