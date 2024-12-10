import { type StepCall, type ZoneObject, parseError } from '@cpn-console/hooks'
import { dump } from 'js-yaml'

export const upsertZone: StepCall<ZoneObject> = async (payload) => {
  try {
    const zone = payload.args
    const { gitlab, vault } = payload.apis
    const values = {
      vault: await vault.getCredentials(),
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
