import { ProjectBase } from '@/plugins/hooks/project.js'
import { StepCall } from '@/plugins/hooks/hook.js'

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
