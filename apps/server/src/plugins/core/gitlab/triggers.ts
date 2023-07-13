import { api } from './utils.js'

export const setProjectTrigger = (projectId: number) => api.PipelineTriggerTokens.create(projectId, 'mirroring-from-external-repo')
