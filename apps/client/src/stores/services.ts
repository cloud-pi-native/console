import { defineStore } from 'pinia'
import api from '@/api/index.js'
import { type Ref, ref } from 'vue'
import { type MonitorServiceModel, MonitorStatus } from '@dso-console/shared'
import type { DsfrAlertType } from '@gouvminint/vue-dsfr'

export type ServicesHealth = {
  message: string,
  status: DsfrAlertType | '',
} | Record<string, never>

const statusPriorities = [MonitorStatus.OK, MonitorStatus.WARNING, MonitorStatus.ERROR, MonitorStatus.UNKNOW]

type ServiceHealthOption = { message: string, status: DsfrAlertType | '', serviceStatus: MonitorStatus }

export const alertTypeMapper: Record<MonitorStatus, DsfrAlertType | ''> = {
  [MonitorStatus.OK]: 'success',
  [MonitorStatus.WARNING]: 'warning',
  [MonitorStatus.ERROR]: 'error',
  [MonitorStatus.UNKNOW]: '',
}
const serviceHealthOptions: ServiceHealthOption[] = [
  {
    message: 'Échec lors de la dernière vérification',
    status: alertTypeMapper[MonitorStatus.UNKNOW],
    serviceStatus: MonitorStatus.UNKNOW,
  },
  {
    message: 'Un ou plusieurs services dysfonctionnent',
    status: alertTypeMapper[MonitorStatus.ERROR],
    serviceStatus: MonitorStatus.ERROR,
  },
  {
    message: 'Un ou plusieurs services sont partiellement dégradés',
    status: alertTypeMapper[MonitorStatus.WARNING],
    serviceStatus: MonitorStatus.WARNING,
  },
  {
    message: 'Tous les services fonctionnent normalement',
    status: alertTypeMapper[MonitorStatus.OK],
    serviceStatus: MonitorStatus.OK,
  },
]
export const useServiceStore = defineStore('service', () => {
  const servicesHealth: Ref<ServicesHealth> = ref({})
  const services: Ref<MonitorServiceModel> = ref([])

  const checkServicesHealth = async () => {
    servicesHealth.value = {
      message: 'Vérification de l\'état des services...',
      status: 'info',
    }

    services.value = await api.checkServicesHealth() as MonitorServiceModel
    servicesHealth.value = serviceHealthOptions[
      services.value.reduce((worstStatusIdx: number, service) => {
        const serviceStatusIdx = serviceHealthOptions.findIndex(status => status.serviceStatus === service.status)
        return serviceStatusIdx < worstStatusIdx ? serviceStatusIdx : worstStatusIdx
      }, statusPriorities.length - 1)
    ]
  }

  return {
    servicesHealth,
    services,
    checkServicesHealth,
  }
})
