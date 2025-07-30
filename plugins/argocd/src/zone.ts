import type { GitlabZoneApi } from '@cpn-console/gitlab-plugin'
import { type StepCall, type ZoneObject, parseError } from '@cpn-console/hooks'
import type { VaultZoneApi } from '@cpn-console/vault-plugin'
import { dump } from 'js-yaml'

export const upsertZone: StepCall<ZoneObject> = async (payload) => {
  try {
    const zone = payload.args
    const vaultApi = payload.apis.vault as VaultZoneApi
    const gitlabApi = payload.apis.gitlab as GitlabZoneApi
    const values = {
      vault: await vaultApi.getCredentials(),
      clusters: zone.clusterNames,
    }
    const zoneRepo = await gitlabApi.getOrCreateInfraProject(zone.slug)
    await gitlabApi.commitCreateOrUpdate(
      zoneRepo.id,
      dump(values),
      'argocd-values.yaml',
    )
    return {
      status: {
        result: 'OK',
        message: 'Zone argocd configuration created/updated',
      },
    }
  } catch (error) {
    return {
      error: parseError(error),
      status: {
        result: 'KO',
        message: 'Failed create/update zone argocd configuration',
      },
    }
  }
}
