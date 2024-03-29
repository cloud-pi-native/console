import { defineStore } from 'pinia'
import api from '@/api/index.js'

export const useAdminZoneStore = defineStore('admin-zone', () => {
  const createZone = async (zone) => {
    const res = await api.createZone(zone)
    return res
  }

  const updateZone = async (zoneId, data) => {
    const res = await api.updateZone(zoneId, data)
    return res
  }

  const deleteZone = async (zoneId) => {
    const res = await api.deleteZone(zoneId)
    return res
  }

  return {
    createZone,
    updateZone,
    deleteZone,
  }
})
