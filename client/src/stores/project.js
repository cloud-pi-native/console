import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/api/index.js'

export const useProjectStore = defineStore('project', () => {
  const selectedProject = ref(undefined)
  const projects = ref(undefined)

  /**
   * @param {string} project
   */
  const setSelectedProject = (project) => {
    selectedProject.value = project
  }
  const getProjects = async () => {
    console.log('store : get project')
    projects.value = await api.getProjects()
  }

  return {
    selectedProject,
    projects,
    setSelectedProject,
    getProjects,
  }
})
