import { PipelineTriggerTokenSchema } from '@gitbeaker/rest'
import { getApi } from './utils.js'

export const setProjectTrigger = (projectId: number): Promise<PipelineTriggerTokenSchema> => {
  const api = getApi()
  return api.PipelineTriggerTokens.create(projectId, 'mirroring-from-external-repo')
}
