import { Gitlab } from '@gitbeaker/rest'
import axios from 'axios'

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

const axiosInstance = axios.create({
  baseURL: vaultPublicUrl,
  headers: {
    'X-Vault-Token': requiredEnv('VAULT_TOKEN'),
  },
})

const api = new Gitlab({ token: gitlabToken, host: gitlabInternalUrl })

const groupRootSearch = await api.Groups.search(projectsRootDir)
const groupRootId = (groupRootSearch.find(grp => grp.full_path === projectsRootDir))?.id

const organizationGroups = await api.Groups.allDescendantGroups(groupRootId, { perPage: 300 })

console.log(organizationGroups.length)
if (organizationGroups.length > 300) {
  throw new Error('increase perPage, you could miss some results')
}

for (const organizationGroup of organizationGroups) {
  if (organizationGroup.name === 'Infra') continue
  console.log(organizationGroup)
  const projectGroups = await api.Groups.allDescendantGroups(organizationGroup.id, { perPage: 300 })
  if (projectGroups.length > 300) {
    throw new Error('increase perPage, you could miss some projects group results')
  }

  for (const projectGroup of projectGroups) {
    const newName = `${organizationGroup.name}-${projectGroup.name}`
    console.log(newName)

    const renamedGroup = await api.Groups.edit(projectGroup.id, { name: newName, path: newName })
    await api.Groups.transfer(renamedGroup.id, { groupId: groupRootId })
  }
  await api.Groups.remove(organizationGroup.id)
}

const coreKvName = 'forge-dso'

const vaultToken = (await axiosInstance.post('/v1/auth/token/create'))
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
  const response = await axiosInstance({
    url: `/v1/${coreKvName}/metadata/${projectsRootDir}${path}`,
    headers: {
      'X-Vault-Token': vaultToken,
    },
    method: 'list',
    validateStatus: code => [200, 404].includes(code),
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
  console.log(secretsMapper)
} catch (error) {
  console.log(error.message)
}

for (const [source, destination] of Object.entries(secretsMapper)) {
  const secretContent = await axiosInstance({
    url: `/v1/${coreKvName}/data/${projectsRootDir}${source}`,
    headers: {
      'X-Vault-Token': vaultToken,
    },
    method: 'get',
    validateStatus: code => [200, 404].includes(code),
  })
  const data = secretContent.data.data.data

  try {
    await axiosInstance({
      method: 'POST',
      url: `/v1/${coreKvName}/data/${projectsRootDir}${destination}`,
      headers: {
        'X-Vault-Token': vaultToken,
      },
      data: { data },
    })
    await axiosInstance({
      method: 'delete',
      url: `/v1/${coreKvName}/metadata/${projectsRootDir}${source}`,
      headers: {
        'X-Vault-Token': vaultToken,
      },
    })
  } catch (error) {
    console.log(error.response.data)
    process.exit(1)
  }
}
