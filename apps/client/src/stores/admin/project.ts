import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import type { GetAllProjectsOutputDto } from '@dso-console/shared'

import api from '@/api/index.js'
import { useUsersStore } from '../users.js'

export const useAdminProjectStore = defineStore('admin-project', () => {
  const usersStore = useUsersStore()
  const allProjects = ref<GetAllProjectsOutputDto>([])

  // const activeProjects = computed(() => allProjects.value.filter(project => project.status !== 'archived'))

  const getAllProjects = async () => {
    allProjects.value = await api.getProjects(true)
    // TODO retirer la clé user de cette réponse d'api ?
    allProjects.value.forEach(project => project.roles.forEach(({ user }) => usersStore.addUser(user)))
  }

  const handleProjectLocking = async (projectId: string, lock: boolean) => {
    return api.handleProjectLocking(projectId, lock)
  }

  const archiveProject = async (projectId: string) => {
    const archivedProject = await api.archiveProject(projectId)
    allProjects.value = allProjects.value.filter(project => project.id !== projectId)
    return archivedProject
  }

  const generateProjectsData = async () => {
    return api.generateProjectsData()
  }

  return {
    allProjects,
    getAllProjects,
    // activeProjects,
    handleProjectLocking,
    archiveProject,
    generateProjectsData,
  }
})
