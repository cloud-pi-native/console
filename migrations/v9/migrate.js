import { logger as baseLogger } from '@cpn-console/logger'
import { Gitlab } from '@gitbeaker/rest'

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

async function vaultRequest(path, options = {}) {
  const method = options.method ?? 'GET'
  const token = options.token ?? vaultAdminToken
  const allowedStatuses = options.allowedStatuses ?? [200]

  const headers = new Headers({
    ...options.headers,
    'X-Vault-Token': token,
  })

  let body
  if (typeof options.body !== 'undefined') {
    headers.set('content-type', 'application/json')
    body = JSON.stringify(options.body)
  }

  const response = await fetch(`${vaultPublicUrl}${path}`, { method, headers, body })

  if (!allowedStatuses.includes(response.status)) {
    const text = await response.text().catch(() => '')
    throw new Error(`Vault request failed (${response.status}) ${method} ${path}${text ? `: ${text}` : ''}`)
  }

  const contentType = response.headers.get('content-type') ?? ''
  if (contentType.includes('application/json')) {
    return { status: response.status, data: await response.json() }
  }
  return { status: response.status, data: await response.text() }
}

const api = new Gitlab({ token: gitlabToken, host: gitlabInternalUrl })
const logger = baseLogger.child({ scope: 'migrations', version: 'v9' })

const groupRootSearch = await api.Groups.search(projectsRootDir)
const groupRootId = (groupRootSearch.find(grp => grp.full_path === projectsRootDir))?.id

const organizationGroups = await api.Groups.allDescendantGroups(groupRootId, { perPage: 300 })

logger.info({ organizationGroupsCount: organizationGroups.length }, 'Found organization groups')
if (organizationGroups.length > 300) {
  throw new Error('increase perPage, you could miss some results')
}

for (const organizationGroup of organizationGroups) {
  if (organizationGroup.name === 'Infra') continue
  logger.info({ groupId: organizationGroup.id, fullPath: organizationGroup.full_path }, 'Processing organization group')
  const projectGroups = await api.Groups.allDescendantGroups(organizationGroup.id, { perPage: 300 })
  if (projectGroups.length > 300) {
    throw new Error('increase perPage, you could miss some projects group results')
  }

  for (const projectGroup of projectGroups) {
    const newName = `${organizationGroup.name}-${projectGroup.name}`
    logger.debug({ groupId: projectGroup.id, newName }, 'Renaming and transferring project group')

    try {
      const renamedGroup = await api.Groups.edit(projectGroup.id, { name: newName, path: newName })
      await api.Groups.transfer(renamedGroup.id, { groupId: groupRootId })
    } catch {
      logger.warn({ groupId: projectGroup.id, organizationGroupId: organizationGroup.id }, 'Failed to transfer group')
    }
  }
}

const coreKvName = 'forge-dso'

const vaultToken = (await vaultRequest('/v1/auth/token/create', { method: 'POST' }))
  .data.auth.client_token

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
  const response = await vaultRequest(`/v1/${coreKvName}/metadata/${projectsRootDir}${path}`, {
    token: vaultToken,
    method: 'LIST',
    allowedStatuses: [200, 404],
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
  logger.info({ secretsCount: Object.keys(secretsMapper).length }, 'Mapped secrets to new paths')
} catch (error) {
  logger.error({ err: error }, 'Failed to list secrets')
}

for (const [source, destination] of Object.entries(secretsMapper)) {
  const secretContent = await vaultRequest(`/v1/${coreKvName}/data/${projectsRootDir}${source}`, {
    token: vaultToken,
    method: 'GET',
    allowedStatuses: [200, 404],
  })
  const data = secretContent.data.data.data

  try {
    await vaultRequest(`/v1/${coreKvName}/data/${projectsRootDir}${destination}`, {
      token: vaultToken,
      method: 'POST',
      body: { data },
    })
    await vaultRequest(`/v1/${coreKvName}/metadata/${projectsRootDir}${source}`, {
      token: vaultToken,
      method: 'DELETE',
    })
  } catch (error) {
    logger.error({ err: error }, 'Failed to move secret')
  }
}
