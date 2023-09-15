import { removeTrailingSlash } from '@dso-console/shared'

export const harborUrl = removeTrailingSlash(process.env.HARBOR_URL)
export const harborUser = process.env.HARBOR_ADMIN
export const harborPassword = process.env.HARBOR_ADMIN_PASSWORD

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
