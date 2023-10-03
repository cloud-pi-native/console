import { defineStore } from 'pinia'
import api from '@/api/index.js'
import type { ProjectInfos } from '@dso-console/shared'

export const useAdminProjectStore = defineStore('admin-project', () => {
  const getAllProjects = async () => {
    return api.getAllProjects()
  }

  const getAllActiveProjects = async () => {
    const allProjects: Array<ProjectInfos> = await getAllProjects()
    return allProjects.filter(project => project.status !== 'archived')
  }

  return {
    getAllProjects,
    getAllActiveProjects,
  }
})
