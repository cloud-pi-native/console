import { defineStore } from 'pinia'
import api from '@/api/index.js'
import { useUsersStore } from '../users.js'

export const useAdminProjectStore = defineStore('admin-project', () => {
  const usersStore = useUsersStore()
  const getAllProjects = async () => {
    const allProjects = await api.getAllProjects()
    // TODO retirer la clé user de cette réponse d'api ?
    // @ts-ignore
    allProjects.forEach(project => project.roles.forEach(({ user }) => usersStore.addUser(user)))
    return allProjects
  }

  const getAllActiveProjects = async () => {
    const allProjects = await getAllProjects()
    // @ts-ignore
    return allProjects.filter(project => project.status !== 'archived')
  }

  const handleProjectLocking = async (projectId: string, lock: boolean) => {
    return api.handleProjectLocking(projectId, lock)
  }

  const replayHooksForProject = async (projectId: string) => {
    await api.replayHooks(projectId)
  }

  const archiveProject = async (projectId: string) => {
    return api.archiveProject(projectId)
  }

  const generateProjectsData = async () => {
    return api.generateProjectsData()
  }

  return {
    getAllProjects,
    getAllActiveProjects,
    handleProjectLocking,
    replayHooksForProject,
    archiveProject,
    generateProjectsData,
  }
})
