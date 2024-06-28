import { defineStore } from 'pinia'
import { useUsersStore } from '../users.js'
import { apiClient, extractData } from '@/api/xhr-client.js'

export const useAdminProjectStore = defineStore('admin-project', () => {
  const usersStore = useUsersStore()
  const getAllProjects = async () => {
    const allProjects = await apiClient.ProjectsAdmin.getAllProjects()
      .then(response => extractData(response, 200))
    // TODO retirer la clé user de cette réponse d'api ?
    // @ts-ignore
    allProjects.forEach(project => project.roles.forEach(({ user }) => usersStore.addUser(user)))
    return allProjects
  }

  const getAllActiveProjects = async () => {
    const allProjects = await getAllProjects()
    return allProjects.filter(project => project.status !== 'archived')
  }

  const handleProjectLocking = (projectId: string, lock: boolean) =>
    apiClient.ProjectsAdmin.patchProject({ body: { lock }, params: { projectId } })
      .then(response => extractData(response, 200))

  const generateProjectsData = () =>
    apiClient.ProjectsAdmin.getProjectsData()
      .then(({ body }) => body)

  return {
    getAllProjects,
    getAllActiveProjects,
    handleProjectLocking,
    generateProjectsData,
  }
})
