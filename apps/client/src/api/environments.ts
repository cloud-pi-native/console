import type { ProjectInfos, Environment, UpdateEnvironmentBody, CreateEnvironmentBody } from '@cpn-console/shared'
import { apiClient } from './xhr-client.js'

export const addEnvironment = async (projectId: ProjectInfos['id'], data: CreateEnvironmentBody) => {
  const response = await apiClient.Environments.createEnvironment({ body: data, params: { projectId } })
  if (response.status === 201) return response.body
}

export const updateEnvironment = async (projectId: ProjectInfos['id'], environmentId: Environment['id'], data: UpdateEnvironmentBody) => {
  const response = await apiClient.Environments.updateEnvironment({ body: data, params: { projectId, environmentId } })
  if (response.status === 200) return response.body
}

export const deleteEnvironment = async (projectId: ProjectInfos['id'], environmentId: Environment['id']) => {
  const response = await apiClient.Environments.deleteEnvironment({ params: { projectId, environmentId } })
  if (response.status === 204) return response.body
}
