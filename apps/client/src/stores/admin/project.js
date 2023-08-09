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

  return {
    getAllProjects,
    getAllActiveProjects,
  }
})
