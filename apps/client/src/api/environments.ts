import type { Project, Environment, UpdateEnvironmentBody, CreateEnvironmentBody } from '@cpn-console/shared'
import { apiClient, extractData } from './xhr-client.js'

export const getEnvironments = (projectId: Project['id']) =>
  apiClient.Environments.getEnvironments({ params: { projectId } })
    .then(response => extractData(response, 200))

export const addEnvironment = (projectId: Project['id'], data: CreateEnvironmentBody) =>
  apiClient.Environments.createEnvironment({ body: data, params: { projectId } })
    .then(response => extractData(response, 201))

export const updateEnvironment = (projectId: Project['id'], environmentId: Environment['id'], data: UpdateEnvironmentBody) =>
  apiClient.Environments.updateEnvironment({ body: data, params: { projectId, environmentId } })
    .then(response => extractData(response, 200))

export const deleteEnvironment = (projectId: Project['id'], environmentId: Environment['id']) =>
  apiClient.Environments.deleteEnvironment({ params: { projectId, environmentId } })
    .then(response => extractData(response, 204))
