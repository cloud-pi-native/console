import { defineStore } from 'pinia'
import { ref, computed, type ComputedRef, type Ref } from 'vue'

import type { CreateProjectDto, ProjectInfos, ProjectParams, UpdateProjectDto, ProjectModel, RoleModel } from '@dso-console/shared'

import api from '@/api/index.js'
import { useUserStore } from './user.js'
import { useUsersStore } from './users.js'

export const useProjectStore = defineStore('project', (): {
  activeProjects: ComputedRef<Array<ProjectInfos>>
  userProjects: ComputedRef<Array<ProjectInfos>>
  selectedProject: Ref<ProjectInfos | undefined>
  projects: Ref<Array<ProjectInfos>>
  setSelectedProject: (id: ProjectParams['projectId']) => void
  updateProject: (projectId: ProjectParams['projectId'], data: UpdateProjectDto) => Promise<void>
  getUserProjects: () => Promise<void>
  getAllProjects: () => Promise<void>
  createProject: (project: CreateProjectDto) => Promise<void>
  archiveProject: (projectId: ProjectParams['projectId']) => Promise<void>
  getProjectSecrets: (projectId: ProjectParams['projectId']) => Promise<void>
  updateProjectRoles: (projectId: ProjectModel['id'], roles: RoleModel[]) => void
} => {
  const userStore = useUserStore()
  const usersStore = useUsersStore()

  const selectedProject = ref<ProjectInfos>()
  const projects = ref<Record<string, ProjectInfos>>({})
  const projectsAsArray = computed<Array<ProjectInfos>>(() => Object.values(projects.value))
  const activeProjects = computed(() => projectsAsArray.value.filter(project => project.status !== 'archived'))
  const userProjects = computed(() => userStore.isAdmin
    ? activeProjects.value.filter(project => project.roles?.some(role => role?.userId === userStore?.userProfile?.id))
    : activeProjects.value,
  )

  const setSelectedProject = (id: ProjectParams['projectId']) => {
    selectedProject.value = projects[id]
  }

  const updateProject = async (projectId: ProjectParams['projectId'], data: UpdateProjectDto) => {
    await api.updateProject(projectId, data)
    await getUserProjects()
  }

  const getUserProjects = async () => {
    const apiResponse = await api.getProjects({ filter: 'user', limit: 100, skip: 0 })
    apiResponse.forEach(project => {
      projects.value[project.id] = project
    })
    if (selectedProject.value) {
      setSelectedProject(selectedProject.value.id)
    }
    await searchUnknownUsers()
  }

  const getAllProjects = async () => {
    const apiResponse = await api.getProjects({ filter: 'admin', limit: 100, skip: 0 })
    apiResponse.forEach(project => {
      projects.value[project.id] = project
    })
    await searchUnknownUsers()
  }

  const createProject = async (project: CreateProjectDto) => {
    await api.createProject(project)
    await getUserProjects()
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

  const searchUnknownUsers = async () => {
    const unknownUser: Record<string, boolean> = {}
    for (const project of projectsAsArray.value) {
      project.roles.forEach(role => {
        if (role.userId in unknownUser) return
        unknownUser[role.userId] = true
      })
    }
    const usersIds = Object.keys(unknownUser)
    if (usersIds.length > 0) await usersStore.getUsers(usersIds)
  }

  return {
    activeProjects,
    userProjects,
    selectedProject,
    projects,
    setSelectedProject,
    updateProject,
    getUserProjects,
    getAllProjects,
    createProject,
    archiveProject,
    getProjectSecrets,
    updateProjectRoles,
  }
})
