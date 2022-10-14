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
    selectedProject.value = res.project.rows[0]?.project
  }

  // TODO : getProjects of current user
  const getProjects = async () => {
    const res = await api.getProjects()
    projects.value = []
    res.projects.rows?.forEach(row => {
      projects.value.push(row.project)
    })
  }

  const orderProject = async (project) => {
    const res = await api.createProject(project)
    return res
  }

  return {
    selectedProject,
    projects,
    setSelectedProject,
    getProjects,
    orderProject,
  }
})
