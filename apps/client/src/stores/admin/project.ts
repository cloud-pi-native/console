import { defineStore } from 'pinia'
import { apiClient } from '@/api/xhr-client.js'
import { useUsersStore } from '../users.js'

export const useAdminProjectStore = defineStore('admin-project', () => {
  const usersStore = useUsersStore()
  const getAllProjects = async () => {
    const allProjects = (await apiClient.v1AdminProjectsList()).data
    // TODO retirer la clé user de cette réponse d'api ?
    // @ts-ignore
    allProjects.forEach(project => project.roles.forEach(({ user }) => usersStore.addUser(user)))
    return allProjects
  }

  const getAllActiveProjects = async () => {
    const allProjects = (await apiClient.v1AdminProjectsList()).data
    // @ts-ignore
    return allProjects.filter(project => project.status !== 'archived')
  }

  const handleProjectLocking = async (projectId: string, lock: boolean) => {
    return (await apiClient.v1AdminProjectsPartialUpdate(projectId, { lock })).data
  }

  const archiveProject = async (projectId: string) => {
    return (await apiClient.v1ProjectsDelete(projectId)).data
  }

  const generateProjectsData = async () => {
    return (await apiClient.v1AdminProjectsDataList()).data
  }

  return {
    getAllProjects,
    getAllActiveProjects,
    handleProjectLocking,
    archiveProject,
    generateProjectsData,
  }
})
