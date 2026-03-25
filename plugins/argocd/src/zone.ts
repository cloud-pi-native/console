import type { StepCall, ZoneObject } from '@cpn-console/hooks'
import { parseError } from '@cpn-console/hooks'
import { updateZoneValues } from './utils.ts'

export const upsertZone: StepCall<ZoneObject> = async (payload) => {
  try {
    const zone = payload.args
    await updateZoneValues(zone, payload.apis)
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
