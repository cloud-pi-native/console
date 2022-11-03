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
    await api.createProject(project)
    await getUserProjects()
  }

  const updateProject = async (project) => {
    await api.updateProject(project.id, project)
    await getUserProjects()
  }

  const addUserToProject = async (newUser) => {
    if (!selectedProject.value.users) {
      selectedProject.value.users = [newUser]
    } else {
      selectedProject.value.users = [...selectedProject.value.users, newUser]
    }
    await updateProject(selectedProject.value)
  }

  return {
    selectedProject,
    projects,
    setSelectedProject,
    getUserProjects,
    createProject,
    updateProject,
    addUserToProject,
  }
})
