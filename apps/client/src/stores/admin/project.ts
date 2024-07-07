import { defineStore } from 'pinia'
import { useUsersStore } from '../users.js'
import { apiClient, extractData } from '@/api/xhr-client.js'
import { useProjectStore } from '../project.js'
import { projectContract } from '@cpn-console/shared'

export const useAdminProjectStore = defineStore('admin-project', () => {
  const projectStore = useProjectStore()
  const usersStore = useUsersStore()

  const getAllProjects = async (query: typeof projectContract.listProjects.query._type) => {
    const projects = await projectStore.listProjects({ query })
    projects.forEach(project => usersStore.addUsersFromMembers(project.members))
    return projects
  }

  const handleProjectLocking = (projectId: string, lock: boolean) =>
    apiClient.ProjectsAdmin.patchProject({ body: { lock }, params: { projectId } })
      .then(response => extractData(response, 200))

  const generateProjectsData = () =>
    apiClient.ProjectsAdmin.getProjectsData()
      .then(response => extractData(response, 200))

  return {
    getAllProjects,
    handleProjectLocking,
    generateProjectsData,
  }
})
