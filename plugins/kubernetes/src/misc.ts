import type { ProjectLite, StepCall } from '@cpn-console/hooks'
import { PatchUtils } from '@kubernetes/client-node'

export const patchOptions = { headers: { 'Content-type': PatchUtils.PATCH_FORMAT_JSON_MERGE_PATCH } }

export const getProjectSecrets: StepCall<ProjectLite> = async () => {
  return {
    status: {
      result: 'OK',
    },
    secrets: {
      imagePullSecrets: 'registry-pull-secret',
    },
  }
}
