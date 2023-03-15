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

    for (const service of selectedProject.value.services) {
      service.status = await api.checkServiceHealth(selectedProject.value.id, service)
    }
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

  const archiveProject = async (projectId) => {
    await api.archiveProject(projectId)
    selectedProject.value = undefined
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
    archiveProject,
  }
})
