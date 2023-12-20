import { defineStore } from 'pinia'
import api from '@/api/index.js'

export const useAdminProjectStore = defineStore('admin-project', () => {
  const getAllProjects = async () => {
    return api.getAllProjects()
  }

  const getAllActiveProjects = async () => {
    const allProjects = await getAllProjects()
    return allProjects.filter(project => project.status !== 'archived')
  }

  const handleProjectLocking = async (projectId: string, lock: boolean) => {
    return api.handleProjectLocking(projectId, lock)
  }

  const archiveProject = async (projectId: string) => {
    return api.archiveProject(projectId)
  }

  return {
    getAllProjects,
    getAllActiveProjects,
    handleProjectLocking,
    archiveProject,
  }
})
