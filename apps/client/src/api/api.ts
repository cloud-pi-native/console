import type { GenerateCIFilesBody, ProjectInfos, CreateRepositoryBody, UpdateRepositoryBody, RepositoryParams, UpdateClusterBody, CreateClusterBody, Environment, UpdateEnvironmentBody, CreateEnvironmentBody, GetLogsQuery, UpdateOrganizationBody, CreateOrganizationBody, CreatePermissionBody, UpdatePermissionBody, CreateQuotaBody, UpdateQuotaStageBody, PatchQuotaBody, CreateStageBody, UpdateStageClustersBody, Cluster, CreateZoneBody, UpdateZoneBody } from '@cpn-console/shared'
import { apiClient } from './xhr-client.js'

// CIFiles
export const generateCIFiles = async (data: GenerateCIFilesBody) => {
  const response = await apiClient.Files.generateCIFiles({ body: data })
  return response.body
}

// Organizations
export const getActiveOrganizations = async () => {
  const response = await apiClient.Organizations.getOrganizations()
  return response.body
}

// Services
export const checkServicesHealth = async () => {
  const response = await apiClient.Services.getServiceHealth()
  return response.body
}

// Repositories
export const addRepo = async (projectId: RepositoryParams['projectId'], data: CreateRepositoryBody) => {
  const response = await apiClient.Repositories.createRepository({ body: data, params: { projectId } })
  return response.body
}

export const getRepos = async (projectId: RepositoryParams['projectId']) => {
  const response = await apiClient.Repositories.getRepositories({ params: { projectId } })
  return response.body
}

export const updateRepo = async (projectId: RepositoryParams['projectId'], repositoryId: RepositoryParams['repositoryId'], data: UpdateRepositoryBody) => {
  if (!data.id) return
  const response = await apiClient.Repositories.updateRepository({ body: data, params: { projectId, repositoryId } })
  return response.body
}

export const deleteRepo = async (projectId: RepositoryParams['projectId'], repositoryId: RepositoryParams['repositoryId']) => {
  const response = await apiClient.Repositories.deleteRepository({ params: { projectId, repositoryId } })
  return response.body
}

// Environments
export const addEnvironment = async (projectId: ProjectInfos['id'], data: CreateEnvironmentBody) => {
  const response = await apiClient.Environments.createEnvironment({ body: data, params: { projectId } })
  return response.body
}

export const updateEnvironment = async (projectId: ProjectInfos['id'], environmentId: Environment['id'], data: UpdateEnvironmentBody) => {
  const response = await apiClient.Environments.updateEnvironment({ body: data, params: { projectId, environmentId } })
  return response.body
}

export const deleteEnvironment = async (projectId: ProjectInfos['id'], environmentId: Environment['id']) => {
  const response = await apiClient.Environments.deleteEnvironment({ params: { projectId, environmentId } })
  return response.body
}

// Quotas
export const getQuotas = async () => {
  const response = await apiClient.Quotas.getQuotas()
  return response.body
}

// Admin - Quotas
export const getQuotaAssociatedEnvironments = async (quotaId: string) => {
  const response = await apiClient.QuotasAdmin.getQuotaEnvironments({ params: { quotaId } })
  return response.body
}

export const addQuota = async (data: CreateQuotaBody) => {
  const response = await apiClient.QuotasAdmin.createQuota({ body: data })
  return response.body
}

export const updateQuotaPrivacy = async (quotaId: string, data: PatchQuotaBody) => {
  const response = await apiClient.QuotasAdmin.patchQuotaPrivacy({ body: data, params: { quotaId } })
  return response.body
}

export const updateQuotaStage = async (data: UpdateQuotaStageBody) => {
  const response = await apiClient.QuotasAdmin.updateQuotaStage({ body: data })
  return response.body
}

export const deleteQuota = async (quotaId: string) => {
  const response = await apiClient.QuotasAdmin.deleteQuota({ params: { quotaId } })
  return response.body
}

// Stages
export const getStages = async () => {
  const response = await apiClient.Stages.getStages()
  return response.body
}

// Admin - Stages
export const getStageAssociatedEnvironments = async (stageId: string) => {
  const response = await apiClient.StagesAdmin.getStageEnvironments({ params: { stageId } })
  return response.body
}

export const addStage = async (data: CreateStageBody) => {
  const response = await apiClient.StagesAdmin.createStage({ body: data })
  return response.body
}

export const updateStageClusters = async (stageId: string, data: UpdateStageClustersBody) => {
  const response = await apiClient.StagesAdmin.updateStageClusters({ body: data, params: { stageId } })
  return response.body
}

export const deleteStage = async (stageId: string) => {
  const response = await apiClient.StagesAdmin.deleteStage({ params: { stageId } })
  return response.body
}

// Permissions
export const addPermission = async (projectId: string, environmentId: string, data: CreatePermissionBody) => {
  const response = await apiClient.Permissions.createPermission({ body: data, params: { projectId, environmentId } })
  return response.body
}

export const updatePermission = async (projectId: string, environmentId: string, data: UpdatePermissionBody) => {
  const response = await apiClient.Permissions.updatePermission({ body: data, params: { projectId, environmentId } })
  return response.body
}

export const getPermissions = async (projectId: string, environmentId: string) => {
  const response = await apiClient.Permissions.getPermissions({ params: { projectId, environmentId } })
  return response.body
}

export const deletePermission = async (projectId: string, environmentId: string, userId: string) => {
  const response = await apiClient.Permissions.deletePermission({ params: { projectId, environmentId, userId } })
  return response.body
}

// Admin - Organizations
export const getAllOrganizations = async () => {
  const response = await apiClient.OrganizationsAdmin.getAllOrganizations()
  return response.body
}

export const createOrganization = async (data: CreateOrganizationBody) => {
  const response = await apiClient.OrganizationsAdmin.createOrganization({ body: data })
  return response.body
}

export const updateOrganization = async (organizationName: CreateOrganizationBody['name'], data: UpdateOrganizationBody) => {
  const response = await apiClient.OrganizationsAdmin.updateOrganization({ body: data, params: { organizationName } })
  return response.body
}

export const fetchOrganizations = async () => {
  const response = await apiClient.OrganizationsAdmin.syncOrganizations()
  return response.body
}

// Admin - Logs
export const getAllLogs = async ({ offset, limit }: GetLogsQuery) => {
  const response = await apiClient.LogsAdmin.getLogs({ query: { offset, limit } })
  return response.body
}

// Clusters
export const getClusters = async () => {
  const response = await apiClient.Clusters.getClusters()
  return response.body
}

// Admin - Clusters
export const getClusterAssociatedEnvironments = async (clusterId: Cluster['id']) => {
  const response = await apiClient.ClustersAdmin.getClusterEnvironments({ params: { clusterId } })
  return response.body
}

export const addCluster = async (data: CreateClusterBody) => {
  const response = await apiClient.ClustersAdmin.createCluster({ body: data })
  return response.body
}

export const updateCluster = async (clusterId: Cluster['id'], data: UpdateClusterBody) => {
  const response = await apiClient.ClustersAdmin.updateCluster({ body: data, params: { clusterId } })
  return response.body
}

export const deleteCluster = async (clusterId: Cluster['id']) => {
  const response = await apiClient.ClustersAdmin.deleteCluster({ params: { clusterId } })
  return response.body
}

// Admin - Zones
export const getZones = async () => {
  const response = await apiClient.Zones.getZones()
  return response.body
}

export const createZone = async (data: CreateZoneBody) => {
  const response = await apiClient.ZonesAdmin.createZone({ body: data })
  return response.body
}

export const updateZone = async (zoneId: string, data: UpdateZoneBody) => {
  const response = await apiClient.ZonesAdmin.updateZone({ body: data, params: { zoneId } })
  return response.body
}

export const deleteZone = async (zoneId: string) => {
  const response = await apiClient.ZonesAdmin.deleteZone({ params: { zoneId } })
  return response.body
}
