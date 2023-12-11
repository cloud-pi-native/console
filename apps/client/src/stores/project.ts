import { defineStore } from 'pinia'
import { type Ref, ref } from 'vue'
import api from '@/api/index.js'
import { type ProjectInfos, type UpdateProjectDto, type UserModel } from '@dso-console/shared'

export const useProjectStore = defineStore('project', () => {
  const selectedProject: Ref<ProjectInfos | undefined> = ref(undefined)
  const selectedProjectOwner: Ref<UserModel | undefined> = ref(undefined)
  const projects: Ref<Array<ProjectInfos>> = ref([])

  const setSelectedProject = (id: ProjectInfos['id']) => {
    selectedProject.value = projects.value.find(project => project.id === id)
    setSelectedProjectOwner(selectedProject.value?.roles)
  }

  const setSelectedProjectOwner = (roles: ProjectInfos['roles']) => {
    selectedProjectOwner.value = roles?.find(role => role.role === 'owner')?.user
  }

  const updateProject = async (projectId: ProjectInfos['id'], data: UpdateProjectDto) => {
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

  const createProject = async (project: ProjectInfos) => {
    await api.createProject(project)
    await getUserProjects()
  }

  const archiveProject = async (projectId: ProjectInfos['id']) => {
    await api.archiveProject(projectId)
    selectedProject.value = undefined
    await getUserProjects()
  }

  const getProjectSecrets = async (projectId: ProjectInfos['id']) => {
    return await api.getProjectSecrets(projectId)
  }

  return {
    selectedProject,
    selectedProjectOwner,
    projects,
    setSelectedProject,
    setSelectedProjectOwner,
    updateProject,
    getUserProjects,
    createProject,
    archiveProject,
    getProjectSecrets,
  }
})
