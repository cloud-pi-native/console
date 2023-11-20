import { PipelineTriggerTokenSchema } from '@gitbeaker/rest'
import { api } from './utils.js'

export const setProjectTrigger = (projectId: number): Promise<PipelineTriggerTokenSchema> => api.PipelineTriggerTokens.create(projectId, 'mirroring-from-external-repo')
