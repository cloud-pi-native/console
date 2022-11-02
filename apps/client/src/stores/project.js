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
    selectedProject.value = projects.value.find(project => project.id === id)
  }

  const getUserProjects = async () => {
    const res = await api.getUserProjects()
    projects.value = res
  }

  const createProject = async (project) => {
    api.createProject(project)
  }

  const updateProject = async (project) => {
    await api.updateProject(project.id, project)
    await getUserProjects()
  }

  return {
    selectedProject,
    projects,
    setSelectedProject,
    getUserProjects,
    createProject,
    updateProject,
  }
})
