import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/api/index.js'

export const useProjectStore = defineStore('project', () => {
  const selectedProject = ref(undefined)
  const selectedProjectOwner = ref(undefined)
  const projects = ref([])

  /**
   * @param {string} project
   */
  const setSelectedProject = async (id) => {
    selectedProject.value = projects.value.find(project => project.id === id)
    await setSelectedProjectOwner()
  }

  const setSelectedProjectOwner = async () => {
    selectedProjectOwner.value = await api.getProjectOwner(selectedProject.value.id)
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

  const addEnvironmentToProject = async (newEnvironment) => {
    await api.addEnvironment(selectedProject.value.id, newEnvironment)
    await getUserProjects()
  }

  const addPermission = async (environmentId, newPermission) => {
    await api.addPermission(selectedProject.value.id, environmentId, newPermission)
    await getUserProjects()
  }

  const addUserToProject = async (newUser) => {
    await api.addUser(selectedProject.value.id, newUser)
    await getUserProjects()
  }

  const updatePermission = async (environmentId, permission) => {
    await api.updatePermission(selectedProject.value.id, environmentId, permission)
    await getUserProjects()
  }

  const removeUserFromProject = async (userId) => {
    await api.removeUser(selectedProject.value.id, userId)
    await getUserProjects()
  }

  const deletePermission = async (environmentId, userId) => {
    await api.deletePermission(selectedProject.value.id, environmentId, userId)
    await getUserProjects()
  }

  return {
    selectedProject,
    selectedProjectOwner,
    projects,
    setSelectedProject,
    setSelectedProjectOwner,
    getUserProjects,
    createProject,
    addRepoToProject,
    addEnvironmentToProject,
    addPermission,
    addUserToProject,
    updatePermission,
    removeUserFromProject,
    deletePermission,
  }
})
