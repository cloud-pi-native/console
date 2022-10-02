import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useProjectStore = defineStore('project', () => {
  const storeSelectedProject = ref(undefined)
  const setSelectedProject = (selectedProject) => {
    storeSelectedProject.value = selectedProject
  }
  return { storeSelectedProject, setSelectedProject }
})
