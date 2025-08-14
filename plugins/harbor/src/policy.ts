import { getApi } from './utils.js'

export interface Policy {
  algorithm: string
  rules: any[]
  trigger: { kind: string, settings: { cron: string }, references: any[] }
  scope: { level: string, ref: number }
}

export async function addRetentionPolicy(
  projectName: string,
  projectId: number,
  policy: Policy,
): Promise<void> {
  const api = getApi()

  const project = await api.projects.getProject(projectName)
  const retentionId = project.data.metadata?.retention_id
    ? Number(project.data.metadata.retention_id)
    : undefined

  // Si le ref (scope) n'est pas précisé dans le policy, on met celui qu'on connaît déjà
  if (!policy.scope?.ref) {
    policy.scope = { level: 'project', ref: projectId }
  }

  if (retentionId) {
    await api.retentions.updateRetention(retentionId, policy)
  } else {
    await api.retentions.createRetention(policy)
  }
}
