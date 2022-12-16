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
    if (selectedProject.value) {
      setSelectedProject(selectedProject.value.id)
    }
  }

  const createProject = async (project) => {
    await api.createProject(project)
    await getUserProjects()
  }

  const addRepoToProject = async (newRepo) => {
    await api.addRepo(selectedProject.value.id, newRepo)
    await getUserProjects()
  }

  const addUserToProject = async (newUser) => {
    await api.addUser(selectedProject.value.id, newUser)
    await getUserProjects()
  }

  const removeUserFromProject = async (userEmail) => {
    await api.removeUser(selectedProject.value.id, userEmail)
    await getUserProjects()
  }

  return {
    selectedProject,
    projects,
    setSelectedProject,
    getUserProjects,
    createProject,
    addRepoToProject,
    addUserToProject,
    removeUserFromProject,
  }
})
