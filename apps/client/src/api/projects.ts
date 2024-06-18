import type { CreateProjectBody, UpdateProjectBody, PatchProjectBody } from '@cpn-console/shared'
import { apiClient, extractData } from './xhr-client.js'

// Project
export const createProject = (data: CreateProjectBody) =>
  apiClient.Projects.createProject({ body: data })
    .then(response => extractData(response, 201))

export const getUserProjects = () =>
  apiClient.Projects.getProjects()
    .then(response => extractData(response, 200))

export const updateProject = (projectId: string, data: UpdateProjectBody) =>
  apiClient.Projects.updateProject({ body: data, params: { projectId } })
    .then(response => extractData(response, 200))

export const replayHooks = (projectId: string) =>
  apiClient.Projects.replayHooksForProject({ params: { projectId } })
    .then(response => extractData(response, 204))

export const archiveProject = (projectId: string) =>
  apiClient.Projects.archiveProject({ params: { projectId } })
    .then(response => extractData(response, 204))

export const getProjectSecrets = (projectId: string) =>
  apiClient.Projects.getProjectSecrets({ params: { projectId } })
    .then(response => extractData(response, 200))

// Admin - Projects
export const getAllProjects = () =>
  apiClient.ProjectsAdmin.getAllProjects()
    .then(response => extractData(response, 200))

export const handleProjectLocking = (projectId: string, lock: PatchProjectBody['lock']) =>
  apiClient.ProjectsAdmin.patchProject({ body: { lock }, params: { projectId } })
    .then(response => extractData(response, 200))

export const generateProjectsData = async () =>
  apiClient.ProjectsAdmin.getProjectsData()
    .then(response => extractData(response, 200))
