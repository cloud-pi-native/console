import { defineStore } from 'pinia'
import api from '@/api/index.js'
import { type Ref, ref } from 'vue'
import { type ErrorTypes, type MonitorResults } from '@dso-console/shared'

export type ServicesHealth = {
  message: string,
  status: ErrorTypes,
} | Record<string, never>

export type Service = {
  name: string,
  status: ErrorTypes,
  message: string,
  code: number,
}

export const useServiceStore = defineStore('service', () => {
  const servicesHealth: Ref<ServicesHealth> = ref({})
  const services: Ref<MonitorResults> = ref([])

  const checkServicesHealth = async () => {
    servicesHealth.value = {
      message: 'Vérification de l\'état des services...',
      status: 'info',
    }
    services.value = []

    services.value = await api.checkServicesHealth()
    servicesHealth.value = services.value
      .find(service => service.status != 0)
      ? {
          message: 'Un ou plusieurs services dysfonctionnent',
          status: 'error',
        }
      : {
          message: 'Tous les services fonctionnent',
          status: 'success',
        }
  }

  return {
    servicesHealth,
    services,
    checkServicesHealth,
  }
})
