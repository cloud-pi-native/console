import type { ProjectLite, StepCall } from '@cpn-console/hooks'

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
