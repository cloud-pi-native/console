import { defineStore } from 'pinia'
import type { CreateZoneBody, UpdateZoneBody, Zone } from '@cpn-console/shared'
import api from '@/api/index.js'

export const useAdminZoneStore = defineStore('admin-zone', () => {
  const createZone = async (zone: CreateZoneBody) => {
    const res = await api.createZone(zone)
    return res
  }

  const updateZone = async (zoneId: Zone['id'], data: UpdateZoneBody) => {
    const res = await api.updateZone(zoneId, data)
    return res
  }

  const deleteZone = async (zoneId: Zone['id']) => {
    const res = await api.deleteZone(zoneId)
    return res
  }

  return {
    createZone,
    updateZone,
    deleteZone,
  }
})
