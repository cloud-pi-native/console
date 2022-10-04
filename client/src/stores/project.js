import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useProjectStore = defineStore('project', () => {
  const selectedProject = ref(undefined)
  const setSelectedProject = (project) => {
    selectedProject.value = project
  }
  return { selectedProject, setSelectedProject }
})
