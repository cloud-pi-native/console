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
    const res = await api.getProjectById(id)
    selectedProject.value = res.data
  }

  // TODO : getProjects of current user
  const getProjects = async () => {
    const res = await api.getProjects()
    projects.value = res.map(({ data }) => data)
  }

  const orderProject = async (project) => {
    return api.createProject(project)
  }

  return {
    selectedProject,
    projects,
    setSelectedProject,
    getProjects,
    orderProject,
  }
})
