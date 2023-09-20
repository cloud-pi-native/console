import { defineStore } from 'pinia'
import api from '@/api/index.js'
import { type Ref, ref } from 'vue'
import { type ErrorTypes } from '@dso-console/shared'

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
  const services: Ref<Array<Service>> = ref([])

  const checkServicesHealth = async () => {
    servicesHealth.value = {
      message: 'Vérification de l\'état des services...',
      status: 'info',
    }
    services.value = []

    services.value = await api.checkServicesHealth()
    servicesHealth.value = services.value
      .map(service => service.code)
      .find(code => code >= 400)
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
