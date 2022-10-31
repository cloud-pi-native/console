import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/api/index.js'

export const useProjectStore = defineStore('project', () => {
  const selectedProject = ref(undefined)
  const projects = ref([])

  /**
   * @param {string} project
   */
  const setSelectedProject = async (id) => {
    const res = await api.getUserProjectById(id)
    selectedProject.value = res.data
  }

  const getUserProjects = async () => {
    const res = await api.getUserProjects()
    projects.value = res?.map(({ data }) => data)
  }

  const orderProject = async (project) => {
    return api.createProject(project)
  }

  return {
    selectedProject,
    projects,
    setSelectedProject,
    getUserProjects,
    orderProject,
  }
})
