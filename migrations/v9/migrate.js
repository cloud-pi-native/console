import { logger as baseLogger } from '@cpn-console/logger/hooks'
import { Gitlab } from '@gitbeaker/rest'

const logger = baseLogger.child({ scope: 'migration:v9' })

export function removeTrailingSlash(url) {
  return url?.endsWith('/')
    ? url.slice(0, -1)
    : url
}

export function requiredEnv(envName) {
  const envValue = process.env[envName]
  if (envValue) return envValue

  throw new Error(`env: ${envName} is not defined !`)
}

const gitlabToken = requiredEnv('GITLAB_TOKEN')
const gitlabPublicUrl = removeTrailingSlash(requiredEnv('GITLAB_URL'))
const projectsRootDir = requiredEnv('PROJECTS_ROOT_DIR')
const gitlabInternalUrl = process.env.GITLAB_INTERNAL_URL
  ? removeTrailingSlash(process.env.GITLAB_INTERNAL_URL)
  : gitlabPublicUrl

const vaultPublicUrl = removeTrailingSlash(requiredEnv('VAULT_URL'))

const vaultAdminToken = requiredEnv('VAULT_TOKEN')

async function vaultRequest({ method, path, token, body, allowedStatus = [200] }) {
  const response = await fetch(`${vaultPublicUrl}${path}`, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      'X-Vault-Token': token,
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!allowedStatus.includes(response.status)) {
    const err = new Error(`Vault request failed: ${method} ${path} (${response.status})`)
    err.response = {
      status: response.status,
    }
    throw err
  }

  if (response.status === 204) {
    return { status: response.status, data: null }
  }

  const text = await response.text()
  const data = text ? JSON.parse(text) : null
  return { status: response.status, data }
}

const api = new Gitlab({ token: gitlabToken, host: gitlabInternalUrl })

const groupRootSearch = await api.Groups.search(projectsRootDir)
const groupRootId = (groupRootSearch.find(grp => grp.full_path === projectsRootDir))?.id

const organizationGroups = await api.Groups.allDescendantGroups(groupRootId, { perPage: 300 })

logger.info({ organizationGroupsCount: organizationGroups.length }, 'Loaded organization groups')
if (organizationGroups.length > 300) {
  throw new Error('increase perPage, you could miss some results')
}

for (const organizationGroup of organizationGroups) {
  if (organizationGroup.name === 'Infra') continue
  logger.info({ organizationGroupId: organizationGroup.id, organizationGroupName: organizationGroup.name }, 'Processing organization group')
  const projectGroups = await api.Groups.allDescendantGroups(organizationGroup.id, { perPage: 300 })
  if (projectGroups.length > 300) {
    throw new Error('increase perPage, you could miss some projects group results')
  }

  for (const projectGroup of projectGroups) {
    const newName = `${organizationGroup.name}-${projectGroup.name}`
    logger.info({ projectGroupId: projectGroup.id, newName }, 'Renaming and transferring project group')

    try {
      const renamedGroup = await api.Groups.edit(projectGroup.id, { name: newName, path: newName })
      await api.Groups.transfer(renamedGroup.id, { groupId: groupRootId })
    } catch (error) {
      logger.warn({ err: error, projectGroupId: projectGroup.id, organizationGroupId: organizationGroup.id }, 'Could not rename/transfer project group')
    }
  }
}

const coreKvName = 'forge-dso'

const vaultToken = (await vaultRequest({
  method: 'POST',
  path: '/v1/auth/token/create',
  token: vaultAdminToken,
})).data.auth.client_token

function transformPath(path) {
  if (!path.startsWith('/')) {
    path = `/${path}`
  }
  const parts = path.split('/')
  return `/${parts[1]}-${parts[2]}/${parts.slice(3).join('/')}`
}
const secretsMapper = {}

async function list(path = '/') {
  if (!path.startsWith('/'))
    path = `/${path}`
  const response = await vaultRequest({
    method: 'LIST',
    path: `/v1/${coreKvName}/metadata/${projectsRootDir}${path}`,
    token: vaultToken,
    allowedStatus: [200, 404],
  })

  if (response.status === 404) return []
  for (const key of response.data.data.keys) {
    if (key.endsWith('/')) {
      await list(`${path}${key}`)
    } else {
      secretsMapper[`${path}${key}`] = transformPath(`${path}${key}`)
    }
  }
}

try {
  await list()
  logger.info({ secretsCount: Object.keys(secretsMapper).length }, 'Collected secrets mapping')
} catch (error) {
  logger.error({ err: error }, 'Failed while collecting secrets mapping')
}

for (const [source, destination] of Object.entries(secretsMapper)) {
  const secretContent = await vaultRequest({
    method: 'GET',
    path: `/v1/${coreKvName}/data/${projectsRootDir}${source}`,
    token: vaultToken,
    allowedStatus: [200, 404],
  })
  if (secretContent.status === 404) {
    logger.warn({ source, destination }, 'Secret not found, skipping')
    continue
  }
  const data = secretContent.data.data.data

  try {
    await vaultRequest({
      method: 'POST',
      path: `/v1/${coreKvName}/data/${projectsRootDir}${destination}`,
      token: vaultToken,
      body: { data },
    })
    await vaultRequest({
      method: 'DELETE',
      path: `/v1/${coreKvName}/metadata/${projectsRootDir}${source}`,
      token: vaultToken,
    })
  } catch (error) {
    logger.error({ err: error, source, destination }, 'Failed while moving secret')
  }
}
