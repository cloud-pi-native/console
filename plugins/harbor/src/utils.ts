import { removeTrailingSlash, requiredEnv } from '@dso-console/shared'

const config: {
  url?: string
  user?: string
  password?: string
  host?: string
} = {}

export const getConfig = ():Required<typeof config> => {
  config.url = config.url ?? removeTrailingSlash(requiredEnv('HARBOR_URL'))
  config.user = config.user ?? requiredEnv('HARBOR_ADMIN')
  config.password = config.password ?? requiredEnv('HARBOR_ADMIN_PASSWORD')
  config.host = config.host ?? config.url.split('://')[1]
  // @ts-ignore
  return config
}

export const getRobotPermissions = (projectName) => {
  return {
    name: 'ci',
    duration: -1,
    description: null,
    disable: false,
    level: 'project',
    permissions: [{
      namespace: projectName,
      kind: 'project',
      access: [{
        resource: 'repository',
        action: 'list',
      }, {
        resource: 'repository',
        action: 'pull',
      }, {
        resource: 'repository',
        action: 'push',
      }, {
        resource: 'repository',
        action: 'delete',
      }, {
        resource: 'artifact',
        action: 'read',
      }, {
        resource: 'artifact',
        action: 'list',
      }, {
        resource: 'artifact',
        action: 'delete',
      }, {
        resource: 'artifact-label',
        action: 'create',
      }, {
        resource: 'artifact-label',
        action: 'delete',
      }, {
        resource: 'tag',
        action: 'create',
      }, {
        resource: 'tag',
        action: 'delete',
      }, {
        resource: 'tag',
        action: 'list',
      }, {
        resource: 'scan',
        action: 'create',
      }, {
        resource: 'scan',
        action: 'stop',
      }, {
        resource: 'helm-chart',
        action: 'read',
      }, {
        resource: 'helm-chart-version',
        action: 'create',
      }, {
        resource: 'helm-chart-version',
        action: 'delete',
      }, {
        resource: 'helm-chart-version-label',
        action: 'create',
      }, {
        resource: 'helm-chart-version-label',
        action: 'delete',
      }],
    }],
  }
}
