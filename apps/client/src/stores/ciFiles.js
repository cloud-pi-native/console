import { defineStore } from 'pinia'
import api from '@/api/index.js'

export const useCIFilesStore = defineStore('ciFiles', () => {
  const generateCIFiles = async (ciData) => {
    const response = await api.generateCIFiles(ciData)
    return response
  }

  return {
    generateCIFiles,
  }
})
