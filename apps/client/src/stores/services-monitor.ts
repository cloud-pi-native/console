import { defineStore } from 'pinia'
import { ref } from 'vue'
import { MonitorStatus, type ServiceBody } from '@cpn-console/shared'
import type { DsfrAlertType } from '@gouvminint/vue-dsfr'
import { apiClient, extractData } from '@/api/xhr-client.js'

export type ServicesHealth = {
  message: string
  status: DsfrAlertType | ''
  dotColor: 'gray' | 'red' | 'green' | 'orange'
} | Record<string, never>

const statusPriorities = [MonitorStatus.OK, MonitorStatus.WARNING, MonitorStatus.ERROR, MonitorStatus.UNKNOW]

type ServiceHealthOption = { message: string, status: DsfrAlertType | '', serviceStatus: MonitorStatus, dotColor: ServicesHealth['dotColor'] }

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
    dotColor: 'gray',
  },
  {
    message: 'Un ou plusieurs services dysfonctionnent',
    status: alertTypeMapper[MonitorStatus.ERROR],
    serviceStatus: MonitorStatus.ERROR,
    dotColor: 'red',
  },
  {
    message: 'Un ou plusieurs services sont partiellement dégradés',
    status: alertTypeMapper[MonitorStatus.WARNING],
    serviceStatus: MonitorStatus.WARNING,
    dotColor: 'orange',
  },
  {
    message: 'Tous les services fonctionnent normalement',
    status: alertTypeMapper[MonitorStatus.OK],
    serviceStatus: MonitorStatus.OK,
    dotColor: 'green',
  },
]

export const useServiceStore = defineStore('serviceMonitor', () => {
  const servicesHealth = ref<ServicesHealth>({})
  const services = ref<ServiceBody>([])
  let interval: NodeJS.Timeout

  const clear = () => interval && clearInterval(interval)

  const checkServicesHealth = async () => {
    servicesHealth.value = {
      message: 'Vérification de l\'état des services...',
      status: 'info',
      dotColor: servicesHealth.value.dotColor,
    }

    const res = await apiClient.Services.getServiceHealth()
    if (res.status === 200) {
      const body = extractData(res, 200)
      services.value = body
      servicesHealth.value = serviceHealthOptions[
        services.value.reduce((worstStatusIdx: number, service) => {
          const serviceStatusIdx = serviceHealthOptions.findIndex(status => status.serviceStatus === service.status)
          return serviceStatusIdx < worstStatusIdx ? serviceStatusIdx : worstStatusIdx
        }, statusPriorities.length - 1)
      ]
      return
    }
    servicesHealth.value = {
      message: 'Échec lors de la dernière vérification',
      status: alertTypeMapper[MonitorStatus.UNKNOW],
      dotColor: 'gray',
    }
  }

  const startHealthPolling = async () => {
    clear()
    await checkServicesHealth()
    interval = setInterval(async () => {
      await checkServicesHealth()
    }, 300_000_000)
  }

  return {
    servicesHealth,
    services,
    checkServicesHealth,
    startHealthPolling,
  }
})
