import { sonarUrl, sonarToken } from '../../utils/env.js'

export const sonarFetch = async ({ method, bodyParams, path }) => {
  const body = new URLSearchParams()
  Object.entries(bodyParams).forEach(params => {
    body.append(params[0], params[1])
  })
  return fetch(`${sonarUrl}/api/${path}`, {
    method,
    body,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: 'Basic ' + Buffer.from(sonarToken + ':').toString('base64'),
    },
  })
}

// idempotent par nature
export const initSonar = async () => {
  await sonarFetch({
    method: 'POST',
    bodyParams: { name: 'Mi-Forge Default' },
    path: 'permissions/create_template',
  })
  const permissions = [
    'admin',
    'codeviewer',
    'issueadmin',
    'securityhotspotadmin',
    'scan',
    'user',
  ]
  for (const permission of permissions) {
    await sonarFetch({
      method: 'POST',
      bodyParams: {
        templateName: 'Mi-Forge Default',
        permission,
      },
      path: 'permissions/add_project_creator_to_template',
    })
    await sonarFetch({
      method: 'POST',
      bodyParams: {
        groupName: 'sonar-administrators',
        templateName: 'Mi-Forge Default',
        permission,
      },
      path: 'permissions/add_group_to_template',
    })
  }
  await sonarFetch({
    method: 'POST',
    bodyParams: {
      templateName: 'Mi-Forge Default',
    },
    path: 'permissions/set_default_template',
  })
}
