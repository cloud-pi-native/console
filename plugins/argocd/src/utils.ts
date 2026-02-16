import { createHmac } from 'node:crypto'
import { removeTrailingSlash, requiredEnv } from '@cpn-console/shared'
import type { ClusterObject, HookPayloadApis, ZoneObject } from '@cpn-console/hooks'
import { dump } from 'js-yaml'

export function generateAppProjectName(projectSlug: string, env: string) {
  const envHash = createHmac('sha256', '')
    .update(env)
    .digest('hex')
    .slice(0, 4)
  return `${projectSlug}-${env}-${envHash}`
}

export function generateApplicationName(projectSlug: string, env: string, repo: string) {
  const envHash = createHmac('sha256', '')
    .update(env)
    .digest('hex')
    .slice(0, 4)
  return `${projectSlug}-${env}-${repo}-${envHash}`
}

const config: {
  namespace?: string
  url?: string
} = {}

export function getConfig(): Required<typeof config> {
  config.namespace = config.namespace ?? requiredEnv('ARGO_NAMESPACE')
  config.url = removeTrailingSlash(requiredEnv('ARGOCD_URL'))

  // @ts-ignore
  return config
}

export async function updateZoneValues(zone: ZoneObject, apis: HookPayloadApis<ZoneObject> | HookPayloadApis<ClusterObject>) {
  const { gitlab, vault } = apis
  const values = {
    vault: await vault.getValues(),
    clusters: zone.clusterNames,
  }
  const zoneRepo = await gitlab.getOrCreateInfraProject(zone.slug)
  await gitlab.commitCreateOrUpdate(zoneRepo.id, dump(values), 'argocd-values.yaml')
  return {
    status: {
      result: 'OK',
      message: 'Zone argocd configuration created/updated',
    },
  }
}
