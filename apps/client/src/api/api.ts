import type { GenerateCIFilesDto, CreateProjectDto, ProjectModel, CreateRepositoryDto, UpdateRepositoryDto, RepositoryModel, UserModel, UpdateClusterDto, CreateClusterDto, ClusterModel, OrganizationModel, EnvironmentModel, UpdateEnvironmentDto, UpdateProjectDto, InitializeEnvironmentDto, AdminLogsGet, UpdateOrganizationDto, CreateOrganizationDto, CreatePermissionDto, UpdatePermissionDto, AddUserDto, UpdateUserDto, CreateQuotaDto, DeleteQuotaDto, UpdateQuotaStageDto, UpdateQuotaPrivacyDto, DeleteStageDto, CreateStageDto, UpdateStageClustersDto } from '@dso-console/shared'
import { apiClient } from './xhr-client.js'

// CIFiles
export const generateCIFiles = async (data: GenerateCIFilesDto['body']) => {
  const response = await apiClient.post('/ci-files', data)
  return response.data
}

// Organizations
export const getActiveOrganizations = async () => {
  const response = await apiClient.get('/organizations')
  return response.data
}

// Project
export const createProject = async (data: CreateProjectDto['body']) => {
  const response = await apiClient.post('/projects', data)
  return response.data
}

export const getUserProjects = async () => {
  const response = await apiClient.get('/projects')
  return response.data
}

export const getUserProjectById = async (projectId: ProjectModel['id']) => {
  const response = await apiClient.get(`/projects/${projectId}`)
  return response.data
}

export const updateProject = async (projectId: ProjectModel['id'], data: UpdateProjectDto['body']) => {
  const response = await apiClient.put(`/projects/${projectId}`, data)
  return response.data
}

export const archiveProject = async (projectId: ProjectModel['id']) => {
  const response = await apiClient.delete(`/projects/${projectId}`)
  return response.data
}

export const getProjectSecrets = async (projectId: ProjectModel['id']) => {
  const response = await apiClient.get(`/projects/${projectId}/secrets`)
  return response.data
}

// Services
export const checkServicesHealth = async () => {
  const response = await apiClient.get('/services')
  return response.data
}

// Repositories
export const addRepo = async (projectId: ProjectModel['id'], data: CreateRepositoryDto['body']) => {
  const response = await apiClient.post(`/projects/${projectId}/repositories`, data)
  return response.data
}

export const getRepos = async (projectId: ProjectModel['id']) => {
  const response = await apiClient.get(`/projects/${projectId}/repositories`)
  return response.data
}

export const updateRepo = async (projectId: ProjectModel['id'], data: UpdateRepositoryDto['body']) => {
  const response = await apiClient.put(`/projects/${projectId}/repositories/${data.id}`, data)
  return response.data
}

export const deleteRepo = async (projectId: ProjectModel['id'], repoId: RepositoryModel['id']) => {
  const response = await apiClient.delete(`/projects/${projectId}/repositories/${repoId}`)
  return response.data
}

// Users
export const getMatchingUsers = async (projectId: ProjectModel['id'], letters: string) => {
  const response = await apiClient.get(`/projects/${projectId}/users/match?letters=${letters}`)
  return response.data
}

export const addUser = async (projectId: ProjectModel['id'], data: AddUserDto['body']) => {
  const response = await apiClient.post(`/projects/${projectId}/users`, data)
  return response.data
}

export const updateUser = async (projectId: ProjectModel['id'], data: UpdateUserDto['body']) => {
  const response = await apiClient.put(`/projects/${projectId}/users/${data.id}`, data)
  return response.data
}

// TODO : pas utilisé
export const getUsers = async (projectId: ProjectModel['id']) => {
  const response = await apiClient.get(`/projects/${projectId}/users`)
  return response.data
}

export const removeUser = async (projectId: ProjectModel['id'], userId: UserModel['id']) => {
  const response = await apiClient.delete(`/projects/${projectId}/users/${userId}`)
  return response.data
}

// Environments
export const addEnvironment = async (projectId: ProjectModel['id'], data: InitializeEnvironmentDto['body']) => {
  const response = await apiClient.post(`/projects/${projectId}/environments`, data)
  return response.data
}

export const updateEnvironment = async (projectId: ProjectModel['id'], environmentId: EnvironmentModel['id'], data: UpdateEnvironmentDto['body']) => {
  const response = await apiClient.put(`/projects/${projectId}/environments/${environmentId}`, data)
  return response.data
}

export const deleteEnvironment = async (projectId: ProjectModel['id'], environmentId: EnvironmentModel['id']) => {
  const response = await apiClient.delete(`/projects/${projectId}/environments/${environmentId}`)
  return response.data
}

// Quotas
export const getQuotas = async () => {
  const response = await apiClient.get('/quotas')
  return response.data
}

// Admin - Quotas
export const getQuotaAssociatedEnvironments = async (quotaId: DeleteQuotaDto['params']['quotaId']) => {
  const response = await apiClient.get(`/admin/quotas/${quotaId}/environments`)
  return response.data
}

export const addQuota = async (data: CreateQuotaDto['body']) => {
  const response = await apiClient.post('/admin/quotas', data)
  return response.data
}

export const updateQuotaPrivacy = async (quotaId: UpdateQuotaPrivacyDto['params']['quotaId'], data: UpdateQuotaPrivacyDto['body']) => {
  const response = await apiClient.patch(`/admin/quotas/${quotaId}/privacy`, data)
  return response.data
}

export const updateQuotaStage = async (data: UpdateQuotaStageDto['body']) => {
  const response = await apiClient.put('/admin/quotas/quotastages', data)
  return response.data
}

export const deleteQuota = async (quotaId: DeleteQuotaDto['params']['quotaId']) => {
  const response = await apiClient.delete(`/admin/quotas/${quotaId}`)
  return response.data
}

// Stages
export const getStages = async () => {
  const response = await apiClient.get('/stages')
  return response.data
}

// Admin - Stages
export const getStageAssociatedEnvironments = async (stageId: DeleteStageDto['params']['stageId']) => {
  const response = await apiClient.get(`/admin/stages/${stageId}/environments`)
  return response.data
}

export const addStage = async (data: CreateStageDto['body']) => {
  const response = await apiClient.post('/admin/stages', data)
  return response.data
}

export const updateStageClusters = async (stageId: UpdateStageClustersDto['params']['stageId'], data: UpdateStageClustersDto['body']) => {
  const response = await apiClient.patch(`/admin/stages/${stageId}/clusters`, data)
  return response.data
}

export const deleteStage = async (stageId: DeleteStageDto['params']['stageId']) => {
  const response = await apiClient.delete(`/admin/stages/${stageId}`)
  return response.data
}

// Permissions
export const addPermission = async (projectId: ProjectModel['id'], environmentId: EnvironmentModel['id'], data: CreatePermissionDto['body']) => {
  const response = await apiClient.post(`/projects/${projectId}/environments/${environmentId}/permissions`, data)
  return response.data
}

export const updatePermission = async (projectId: ProjectModel['id'], environmentId: EnvironmentModel['id'], data: UpdatePermissionDto['body']) => {
  const response = await apiClient.put(`/projects/${projectId}/environments/${environmentId}/permissions`, data)
  return response.data
}

export const getPermissions = async (projectId: ProjectModel['id'], environmentId: EnvironmentModel['id']) => {
  const response = await apiClient.get(`/projects/${projectId}/environments/${environmentId}/permissions`)
  return response.data
}

export const deletePermission = async (projectId: ProjectModel['id'], environmentId: EnvironmentModel['id'], userId: UserModel['id']) => {
  const response = await apiClient.delete(`/projects/${projectId}/environments/${environmentId}/permissions/${userId}`)
  return response.data
}

// Admin - Users
export const getAllUsers = async () => {
  const response = await apiClient.get('/admin/users')
  return response.data
}

// Admin - Organizations
export const getAllOrganizations = async () => {
  const response = await apiClient.get('/admin/organizations')
  return response.data
}

export const createOrganization = async (data: CreateOrganizationDto['body']) => {
  const response = await apiClient.post('/admin/organizations', data)
  return response.data
}

export const updateOrganization = async (orgName: OrganizationModel['name'], data: UpdateOrganizationDto['body']) => {
  const response = await apiClient.put(`/admin/organizations/${orgName}`, data)
  return response.data
}

export const fetchOrganizations = async () => {
  const response = await apiClient.put('/admin/organizations/sync')
  return response.data
}

// Admin - Projects
export const getAllProjects = async () => {
  const response = await apiClient.get('/admin/projects')
  return response.data
}

// Admin - Logs
export const getAllLogs = async ({ offset, limit }: AdminLogsGet['query']) => {
  const response = await apiClient.get(`/admin/logs?offset=${offset}&limit=${limit}`)
  return response.data
}

// Clusters
export const getClusters = async () => {
  const response = await apiClient.get('/clusters')
  return response.data
}

// Admin - Clusters
export const getClusterAssociatedEnvironments = async (clusterId: ClusterModel['id']) => {
  const response = await apiClient.get(`/admin/clusters/${clusterId}/environments`)
  return response.data
}

export const addCluster = async (data: CreateClusterDto['body']) => {
  const response = await apiClient.post('/admin/clusters', data)
  return response.data
}

export const updateCluster = async (clusterId: ClusterModel['id'], data: UpdateClusterDto['body']) => {
  const response = await apiClient.put(`/admin/clusters/${clusterId}`, data)
  return response.data
}

export const deleteCluster = async (clusterId: ClusterModel['id']) => {
  const response = await apiClient.delete(`/admin/clusters/${clusterId}`)
  return response.data
}
