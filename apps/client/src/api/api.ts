import type { GenerateCIFilesDto, ProjectModel, CreateRepositoryDto, UpdateRepositoryDto, UpdateClusterDto, CreateClusterDto, EnvironmentModel, UpdateEnvironmentDto, InitializeEnvironmentDto, AdminLogsQuery, UpdateOrganizationDto, CreateOrganizationDto, SetPermissionDto, UpdatePermissionDto, CreateQuotaDto, UpdateQuotaStageDto, UpdateQuotaPrivacyDto, CreateStageDto, UpdateStageClustersDto, PermissionParams, DeletePermissionParams, RepositoryParams, ClusterParams, QuotaParams, StageParams } from '@cpn-console/shared'
import { apiClient } from './xhr-client.js'

// CIFiles
export const generateCIFiles = async (data: GenerateCIFilesDto) => {
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
export const addRepo = async (projectId: RepositoryParams['projectId'], data: CreateRepositoryDto) => {
  const response = await apiClient.Repositories.createRepository({ body: data, params: { projectId } })
  return response.body
}

export const getRepos = async (projectId: RepositoryParams['projectId']) => {
  const response = await apiClient.Repositories.getRepositories({ params: { projectId } })
  return response.body
}

export const updateRepo = async (projectId: RepositoryParams['projectId'], data: UpdateRepositoryDto) => {
  const response = await apiClient.Repositories.updateRepository({ body: data, params: { projectId, repositoryId: data.id } })
  return response.body
}

export const deleteRepo = async (projectId: RepositoryParams['projectId'], repositoryId: RepositoryParams['repositoryId']) => {
  const response = await apiClient.Repositories.deleteRepository({ params: { projectId, repositoryId } })
  return response.body
}

// Environments
export const addEnvironment = async (projectId: ProjectModel['id'], data: InitializeEnvironmentDto) => {
  const response = await apiClient.Environments.createEnvironment({ body: data, params: { projectId } })
  return response.body
}

export const updateEnvironment = async (projectId: ProjectModel['id'], environmentId: EnvironmentModel['id'], data: UpdateEnvironmentDto) => {
  const response = await apiClient.Environments.updateEnvironment({ body: data, params: { projectId, environmentId } })
  return response.body
}

export const deleteEnvironment = async (projectId: ProjectModel['id'], environmentId: EnvironmentModel['id']) => {
  const response = await apiClient.Environments.deleteEnvironment({ params: { projectId, environmentId } })
  return response.body
}

// Quotas
export const getQuotas = async () => {
  const response = await apiClient.Quotas.getQuotas()
  return response.body
}

// Admin - Quotas
export const getQuotaAssociatedEnvironments = async (quotaId: QuotaParams['quotaId']) => {
  const response = await apiClient.QuotasAdmin.getQuotaEnvironments({ params: { quotaId } })
  return response.body
}

export const addQuota = async (data: CreateQuotaDto) => {
  const response = await apiClient.QuotasAdmin.createQuota({ body: data })
  return response.body
}

export const updateQuotaPrivacy = async (quotaId: QuotaParams['quotaId'], data: UpdateQuotaPrivacyDto) => {
  const response = await apiClient.QuotasAdmin.patchQuotaPrivacy({ body: data, params: { quotaId } })
  return response.body
}

export const updateQuotaStage = async (data: UpdateQuotaStageDto) => {
  const response = await apiClient.QuotasAdmin.updateQuotaStage({ body: data })
  return response.body
}

export const deleteQuota = async (quotaId: QuotaParams['quotaId']) => {
  const response = await apiClient.QuotasAdmin.deleteQuota({ params: { quotaId } })
  return response.body
}

// Stages
export const getStages = async () => {
  const response = await apiClient.Stages.getStages()
  return response.body
}

// Admin - Stages
export const getStageAssociatedEnvironments = async (stageId: StageParams['stageId']) => {
  const response = await apiClient.StagesAdmin.getStageEnvironments({ params: { stageId } })
  return response.body
}

export const addStage = async (data: CreateStageDto) => {
  const response = await apiClient.StagesAdmin.createStage({ body: data })
  return response.body
}

export const updateStageClusters = async (stageId: StageParams['stageId'], data: UpdateStageClustersDto) => {
  const response = await apiClient.StagesAdmin.updateStageClusters({ body: data, params: { stageId } })
  return response.body
}

export const deleteStage = async (stageId: StageParams['stageId']) => {
  const response = await apiClient.StagesAdmin.deleteStage({ params: { stageId } })
  return response.body
}

// Permissions
export const addPermission = async (projectId: PermissionParams['projectId'], environmentId: PermissionParams['environmentId'], data: SetPermissionDto) => {
  const response = await apiClient.Permissions.createPermission({ body: data, params: { projectId, environmentId } })
  return response.body
}

export const updatePermission = async (projectId: PermissionParams['projectId'], environmentId: PermissionParams['environmentId'], data: UpdatePermissionDto) => {
  const response = await apiClient.Permissions.updatePermission({ body: data, params: { projectId, environmentId } })
  return response.body
}

export const getPermissions = async (projectId: PermissionParams['projectId'], environmentId: PermissionParams['environmentId']) => {
  const response = await apiClient.Permissions.getPermissions({ params: { projectId, environmentId } })
  return response.body
}

export const deletePermission = async (projectId: DeletePermissionParams['projectId'], environmentId: DeletePermissionParams['environmentId'], userId: DeletePermissionParams['userId']) => {
  const response = await apiClient.Permissions.deletePermission({ params: { projectId, environmentId, userId } })
  return response.body
}

// Admin - Organizations
export const getAllOrganizations = async () => {
  const response = await apiClient.OrganizationsAdmin.getAllOrganizations()
  return response.body
}

export const createOrganization = async (data: CreateOrganizationDto) => {
  const response = await apiClient.OrganizationsAdmin.createOrganization({ body: data })
  return response.body
}

export const updateOrganization = async (organizationName: CreateOrganizationDto['name'], data: UpdateOrganizationDto) => {
  const response = await apiClient.OrganizationsAdmin.updateOrganization({ body: data, params: { organizationName } })
  return response.body
}

export const fetchOrganizations = async () => {
  const response = await apiClient.OrganizationsAdmin.syncOrganizations()
  return response.body
}

// Admin - Logs
export const getAllLogs = async ({ offset, limit }: AdminLogsQuery) => {
  const response = await apiClient.LogsAdmin.getLogs({ query: { offset, limit } })
  return response.body
}

// Clusters
export const getClusters = async () => {
  const response = await apiClient.Clusters.getClusters()
  return response.body
}

// Admin - Clusters
export const getClusterAssociatedEnvironments = async (clusterId: ClusterParams['clusterId']) => {
  const response = await apiClient.ClustersAdmin.getClusterEnvironments({ params: { clusterId } })
  return response.body
}

export const addCluster = async (data: CreateClusterDto) => {
  const response = await apiClient.ClustersAdmin.createCluster({ body: data })
  return response.body
}

export const updateCluster = async (clusterId: ClusterParams['clusterId'], data: UpdateClusterDto) => {
  const response = await apiClient.ClustersAdmin.updateCluster({ body: data, params: { clusterId } })
  return response.body
}

export const deleteCluster = async (clusterId: ClusterParams['clusterId']) => {
  const response = await apiClient.ClustersAdmin.deleteCluster({ params: { clusterId } })
  return response.body
}

// Admin - Zones
export const getZones = async () => {
  const response = await apiClient.Zones.getZones()
  return response.body
}

export const createZone = async (data) => {
  const response = await apiClient.ZonesAdmin.createZone({ body: data })
  return response.body
}

export const updateZone = async (zoneId: string, data) => {
  const response = await apiClient.ZonesAdmin.updateZone({ body: data, params: { zoneId } })
  return response.body
}

export const deleteZone = async (zoneId: string) => {
  const response = await apiClient.ZonesAdmin.deleteZone({ params: { zoneId } })
  return response.body
}
