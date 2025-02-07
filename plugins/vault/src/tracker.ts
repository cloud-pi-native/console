import { hostFunctions } from '@cpn-console/hooks'
import { technicalKvName, VaultApi } from './class.js'
import infos from './infos.js'
import { ItemCollector } from '@cpn-console/shared'

async function trackPolicies() {
  const vaultApi = new VaultApi()
  const policiesList = await vaultApi.Policy.list() as string[]
  const vaultPolicies = new ItemCollector<string>()
  const patterns = [/^app--(.*)--admin$/, /^tech--(.*)--r[ow]$/]
  for (const policy of policiesList) {
    if (policy.startsWith('tech--zone-')) {
      continue
    }
    for (const pattern of patterns) {
      if (policy.match(pattern)) {
        const extractName = policy.replace(pattern, '$1')
        if (extractName) {
          vaultPolicies.add(extractName, policy)
        }
      }
    }
  }
  const projectsStatus = await hostFunctions.getProjectsStatus(vaultPolicies.keys())
  for (const project of projectsStatus) {
    if (['created', 'initializing', 'failed', 'warning'].includes(project.status)) {
      vaultPolicies.delete(`${project.slug}`)
    }
  }
  return vaultPolicies.collector
}

async function trackKvs() {
  const vaultApi = new VaultApi()
  const kvList = await vaultApi.Kv.list() as Record<string, any>

  const vaultKvs: Record<string, any> = {}

  const reservedKvNames = [technicalKvName, 'sys', 'identity', 'cubbyhole']
  const reservedMatch = /^zone-/

  for (let [name, kv] of Object.entries(kvList)) {
    name = name.slice(0, -1)
    if (!reservedKvNames.includes(name) && !reservedMatch.test(name)) {
      vaultKvs[name] = kv
    }
  }

  const projectsStatus = await hostFunctions.getProjectsStatus(Object.keys(vaultKvs).map(name => name.slice(0, -1)))
  for (const project of projectsStatus) {
    if (['created', 'initializing', 'failed', 'warning'].includes(project.status)) {
      delete vaultKvs[`${project.slug}`]
    }
  }
  return Object.keys(vaultKvs)
}

export async function tracker() {
  try {
    const policies = await trackPolicies()
    const vaultKvs = await trackKvs()
    await hostFunctions.updateReport(
      infos.name,
      JSON.stringify({
        vaultKvs,
        policies,
      }),
    )
  } catch (error) {
    console.log(error)
  }
}

export function startTracker() {
  tracker()
  setInterval(() => {
    tracker()
  }, 1000 * 60 * 5)
}
