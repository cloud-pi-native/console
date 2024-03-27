import api from '@/api/index.js'
import type { CreateProjectDto, ProjectInfos, ProjectModel, ProjectParams, RoleModel, UpdateProjectDto } from '@cpn-console/shared'
import { defineStore } from 'pinia'
import { ref, type Ref } from 'vue'

export const useProjectStore = defineStore('project', () => {
  const selectedProject: Ref<ProjectInfos | undefined> = ref(undefined)
  const projects: Ref<Array<ProjectInfos>> = ref([])

  const setSelectedProject = (id: ProjectParams['projectId']) => {
    selectedProject.value = projects.value.find(project => project.id === id)
  }

  const updateProject = async (projectId: ProjectParams['projectId'], data: UpdateProjectDto) => {
    await api.updateProject(projectId, data)
    await getUserProjects()
  }

  const getUserProjects = async () => {
    const res = await api.getUserProjects()
    projects.value = res
    if (selectedProject.value) {
      setSelectedProject(selectedProject.value.id)
    }
  }

  const createProject = async (project: CreateProjectDto) => {
    await api.createProject(project)
    await getUserProjects()
  }

  const replayHooksForProject = async (projectId: string) => {
    return api.replayHooks(projectId)
  }

  const archiveProject = async (projectId: ProjectParams['projectId']) => {
    await api.archiveProject(projectId)
    selectedProject.value = undefined
    await getUserProjects()
  }

  const getProjectSecrets = async (projectId: ProjectParams['projectId']) => {
    return await api.getProjectSecrets(projectId)
  }

  const updateProjectRoles = (projectId: ProjectModel['id'], roles: RoleModel[]) => {
    const project = projects.value.find(project => project.id === projectId)
    if (!project) return
    project.roles = roles
  }

  return {
    selectedProject,
    projects,
    setSelectedProject,
    updateProject,
    getUserProjects,
    createProject,
    replayHooksForProject,
    archiveProject,
    getProjectSecrets,
    updateProjectRoles,
  }
})
