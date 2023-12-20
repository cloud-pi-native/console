import type { GenerateCIFilesDto, CreateProjectDto, ProjectModel, CreateRepositoryDto, UpdateRepositoryDto, UpdateClusterDto, CreateClusterDto, EnvironmentModel, UpdateEnvironmentDto, UpdateProjectDto, InitializeEnvironmentDto, AdminLogsQuery, UpdateOrganizationDto, CreateOrganizationDto, SetPermissionDto, UpdatePermissionDto, CreateQuotaDto, UpdateQuotaStageDto, UpdateQuotaPrivacyDto, CreateStageDto, UpdateStageClustersDto, PermissionParams, DeletePermissionParams, RepositoryParams, ProjectParams, ClusterParams, QuotaParams, StageParams, AddUserToProjectDto, UpdateUserProjectRoleDto, UserParams, RoleParams, LettersQuery, GetAllOrganizationsDto, GetAllProjectsDto } from '@dso-console/shared'
import { apiClient } from './xhr-client.js'

// CIFiles
export const generateCIFiles = async (data: GenerateCIFilesDto) => {
  const response = await apiClient.post('/ci-files', data)
  return response.data
}

// Organizations
export const getActiveOrganizations = async () => {
  const response = await apiClient.get('/organizations')
  return response.data
}

// Project
export const createProject = async (data: CreateProjectDto) => {
  const response = await apiClient.post('/projects', data)
  return response.data
}

export const getUserProjects = async () => {
  const response = await apiClient.get('/projects')
  return response.data
}

export const getUserProjectById = async (projectId: ProjectParams['projectId']) => {
  const response = await apiClient.get(`/projects/${projectId}`)
  return response.data
}

export const updateProject = async (projectId: ProjectParams['projectId'], data: UpdateProjectDto) => {
  const response = await apiClient.put(`/projects/${projectId}`, data)
  return response.data
}

export const archiveProject = async (projectId: ProjectParams['projectId']) => {
  const response = await apiClient.delete(`/projects/${projectId}`)
  return response.data
}

export const getProjectSecrets = async (projectId: ProjectParams['projectId']) => {
  const response = await apiClient.get(`/projects/${projectId}/secrets`)
  return response.data
}

// Services
export const checkServicesHealth = async () => {
  const response = await apiClient.get('/services')
  return response.data
}

// Repositories
export const addRepo = async (projectId: RepositoryParams['projectId'], data: CreateRepositoryDto) => {
  const response = await apiClient.post(`/projects/${projectId}/repositories`, data)
  return response.data
}

export const getRepos = async (projectId: RepositoryParams['projectId']) => {
  const response = await apiClient.get(`/projects/${projectId}/repositories`)
  return response.data
}

export const updateRepo = async (projectId: RepositoryParams['projectId'], data: UpdateRepositoryDto) => {
  const response = await apiClient.put(`/projects/${projectId}/repositories/${data.id}`, data)
  return response.data
}

export const deleteRepo = async (projectId: RepositoryParams['projectId'], repoId: RepositoryParams['repositoryId']) => {
  const response = await apiClient.delete(`/projects/${projectId}/repositories/${repoId}`)
  return response.data
}

// Users
export const getMatchingUsers = async (projectId: UserParams['projectId'], letters: LettersQuery['letters']) => {
  const response = await apiClient.get(`/projects/${projectId}/users/match?letters=${letters}`)
  return response.data
}

export const addUserToProject = async (projectId: UserParams['projectId'], data: AddUserToProjectDto) => {
  const response = await apiClient.post(`/projects/${projectId}/users`, data)
  return response.data
}

export const updateUserProjectRole = async (projectId: RoleParams['projectId'], userId: RoleParams['userId'], data: UpdateUserProjectRoleDto) => {
  const response = await apiClient.put(`/projects/${projectId}/users/${userId}`, data)
  return response.data
}

// TODO : pas utilisé
export const getUsers = async (projectId: UserParams['projectId']) => {
  const response = await apiClient.get(`/projects/${projectId}/users`)
  return response.data
}

export const removeUser = async (projectId: RoleParams['projectId'], userId: RoleParams['userId']) => {
  const response = await apiClient.delete(`/projects/${projectId}/users/${userId}`)
  return response.data
}

// Environments
export const addEnvironment = async (projectId: ProjectModel['id'], data: InitializeEnvironmentDto) => {
  const response = await apiClient.post(`/projects/${projectId}/environments`, data)
  return response.data
}

export const updateEnvironment = async (projectId: ProjectModel['id'], environmentId: EnvironmentModel['id'], data: UpdateEnvironmentDto) => {
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
export const getQuotaAssociatedEnvironments = async (quotaId: QuotaParams['quotaId']) => {
  const response = await apiClient.get(`/admin/quotas/${quotaId}/environments`)
  return response.data
}

export const addQuota = async (data: CreateQuotaDto) => {
  const response = await apiClient.post('/admin/quotas', data)
  return response.data
}

export const updateQuotaPrivacy = async (quotaId: QuotaParams['quotaId'], data: UpdateQuotaPrivacyDto) => {
  const response = await apiClient.patch(`/admin/quotas/${quotaId}/privacy`, data)
  return response.data
}

export const updateQuotaStage = async (data: UpdateQuotaStageDto) => {
  const response = await apiClient.put('/admin/quotas/quotastages', data)
  return response.data
}

export const deleteQuota = async (quotaId: QuotaParams['quotaId']) => {
  const response = await apiClient.delete(`/admin/quotas/${quotaId}`)
  return response.data
}

// Stages
export const getStages = async () => {
  const response = await apiClient.get('/stages')
  return response.data
}

// Admin - Stages
export const getStageAssociatedEnvironments = async (stageId: StageParams['stageId']) => {
  const response = await apiClient.get(`/admin/stages/${stageId}/environments`)
  return response.data
}

export const addStage = async (data: CreateStageDto) => {
  const response = await apiClient.post('/admin/stages', data)
  return response.data
}

export const updateStageClusters = async (stageId: StageParams['stageId'], data: UpdateStageClustersDto) => {
  const response = await apiClient.patch(`/admin/stages/${stageId}/clusters`, data)
  return response.data
}

export const deleteStage = async (stageId: StageParams['stageId']) => {
  const response = await apiClient.delete(`/admin/stages/${stageId}`)
  return response.data
}

// Permissions
export const addPermission = async (projectId: PermissionParams['projectId'], environmentId: PermissionParams['environmentId'], data: SetPermissionDto) => {
  const response = await apiClient.post(`/projects/${projectId}/environments/${environmentId}/permissions`, data)
  return response.data
}

export const updatePermission = async (projectId: PermissionParams['projectId'], environmentId: PermissionParams['environmentId'], data: UpdatePermissionDto) => {
  const response = await apiClient.put(`/projects/${projectId}/environments/${environmentId}/permissions`, data)
  return response.data
}

export const getPermissions = async (projectId: PermissionParams['projectId'], environmentId: PermissionParams['environmentId']) => {
  const response = await apiClient.get(`/projects/${projectId}/environments/${environmentId}/permissions`)
  return response.data
}

export const deletePermission = async (projectId: DeletePermissionParams['projectId'], environmentId: DeletePermissionParams['environmentId'], userId: DeletePermissionParams['userId']) => {
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
  const response: { data: GetAllOrganizationsDto } = await apiClient.get('/admin/organizations')
  return response.data
}

export const createOrganization = async (data: CreateOrganizationDto) => {
  const response = await apiClient.post('/admin/organizations', data)
  return response.data
}

export const updateOrganization = async (orgName: CreateOrganizationDto['name'], data: UpdateOrganizationDto) => {
  const response = await apiClient.put(`/admin/organizations/${orgName}`, data)
  return response.data
}

export const fetchOrganizations = async () => {
  const response = await apiClient.put('/admin/organizations/sync')
  return response.data
}

// Admin - Projects
export const getAllProjects = async () => {
  const response: { data: GetAllProjectsDto } = await apiClient.get('/admin/projects')
  console.log({ projects: response.data })

  return response.data
}

export const handleProjectLocking = async (projectId: string, lock: boolean) => {
  const response = await apiClient.patch(`/admin/projects/${projectId}`, { lock })
  return response.data
}

// Admin - Logs
export const getAllLogs = async ({ offset, limit }: AdminLogsQuery) => {
  const response = await apiClient.get(`/admin/logs?offset=${offset}&limit=${limit}`)
  return response.data
}

// Clusters
export const getClusters = async () => {
  const response = await apiClient.get('/clusters')
  return response.data
}

export const getAdminClusters = async () => {
  const response = await apiClient.get('/admin/clusters')
  return response.data
}

// Admin - Clusters
export const getClusterAssociatedEnvironments = async (clusterId: ClusterParams['clusterId']) => {
  const response = await apiClient.get(`/admin/clusters/${clusterId}/environments`)
  return response.data
}

export const addCluster = async (data: CreateClusterDto) => {
  const response = await apiClient.post('/admin/clusters', data)
  return response.data
}

export const updateCluster = async (clusterId: ClusterParams['clusterId'], data: UpdateClusterDto) => {
  const response = await apiClient.put(`/admin/clusters/${clusterId}`, data)
  return response.data
}

export const deleteCluster = async (clusterId: ClusterParams['clusterId']) => {
  const response = await apiClient.delete(`/admin/clusters/${clusterId}`)
  return response.data
}
