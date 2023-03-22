import { defineStore } from 'pinia'
import api from '@/api/index.js'
import { ref } from 'vue'

export const useServiceStore = defineStore('service', () => {
  const servicesHealth = ref({})
  const services = ref({})

  const checkServiceHealth = async () => {
    servicesHealth.value = {
      message: 'Vérification de l\'état des services...',
      status: 'info',
    }
    services.value = {}

    services.value = await api.checkServiceHealth()
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
    checkServiceHealth,
  }
})
