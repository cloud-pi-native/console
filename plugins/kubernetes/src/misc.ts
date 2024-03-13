import type { ProjectBase, StepCall } from '@cpn-console/hooks'

export const getProjectSecrets: StepCall<ProjectBase> = async () => {
  return {
    status: {
      result: 'OK',
    },
    secrets: {
      imagePullSecrets: 'registry-pull-secret',
    },
  }
}
