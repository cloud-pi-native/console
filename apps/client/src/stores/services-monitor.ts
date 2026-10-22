import type { ServiceBody } from '@cpn-console/shared'
// @ts-ignore '@gouvminint/vue-dsfr' missing types
import type { DsfrAlertType } from '@gouvminint/vue-dsfr'
import { MonitorStatus } from '@cpn-console/shared'
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { apiClient, extractData } from '@/api/xhr-client.js'

export type ServicesHealth = {
  message: string
  status: DsfrAlertType | undefined
  dotColor: 'gray' | 'red' | 'green' | 'orange' | 'blue'
} | Record<string, never>

interface ServiceHealthOption { message: string, status: DsfrAlertType | undefined, serviceStatus: MonitorStatus, dotColor: ServicesHealth['dotColor'] }

export const alertTypeMapper: Record<MonitorStatus, DsfrAlertType | undefined> = {
  [MonitorStatus.OK]: 'success',
  [MonitorStatus.WARNING]: 'warning',
  [MonitorStatus.ERROR]: 'error',
  [MonitorStatus.UNKNOW]: undefined,
}

export const HEALTH_POLL_INTERVAL_MS = 5 * 60 * 1000

const serviceHealthOptions = {
  fetching: {
    message: 'Vérification de l\'état des services...',
    status: 'info',
    serviceStatus: MonitorStatus.UNKNOW,
    dotColor: 'blue',
  },
  fetchError: {
    message: 'Échec lors de la dernière vérification',
    status: alertTypeMapper[MonitorStatus.UNKNOW],
    serviceStatus: MonitorStatus.UNKNOW,
    dotColor: 'gray',
  },
  error: {
    message: 'Un ou plusieurs services dysfonctionnent',
    status: alertTypeMapper[MonitorStatus.ERROR],
    serviceStatus: MonitorStatus.ERROR,
    dotColor: 'red',
  },
  warn: {
    message: 'Un ou plusieurs services sont partiellement dégradés',
    status: alertTypeMapper[MonitorStatus.WARNING],
    serviceStatus: MonitorStatus.WARNING,
    dotColor: 'orange',
  },
  ok: {
    message: 'Tous les services fonctionnent normalement',
    status: alertTypeMapper[MonitorStatus.OK],
    serviceStatus: MonitorStatus.OK,
    dotColor: 'green',
  },
} as const satisfies Record<string, ServiceHealthOption>

export const useServiceStore = defineStore('serviceMonitor', () => {
  const callStatus = ref<'ok' | 'fetching' | 'error'>('fetching')

  const displayCause = ref(false)
  const services = ref<ServiceBody>([])

  const serviceHealthIndex = computed<keyof typeof serviceHealthOptions>(() => {
    if (callStatus.value === 'fetching') {
      return 'fetching'
    }
    if (services.value.some(({ status }) => status === 'Dégradé')) {
      return 'warn'
    }
    if (services.value.some(({ status }) => status === 'En échec')) {
      return 'error'
    }
    if (services.value.some(({ status }) => status === 'Inconnu')) {
      return 'fetchError'
    }
    return 'ok'
  })

  const servicesHealth = computed<ServicesHealth>(() => serviceHealthOptions[serviceHealthIndex.value])
  let interval: ReturnType<typeof setInterval> | undefined

  const clear = () => {
    if (!interval) return
    clearInterval(interval)
    interval = undefined
  }

  const checkServicesHealth = async () => {
    callStatus.value = 'fetching'
    try {
      services.value = await (displayCause.value
        ? apiClient.Services.getCompleteServiceHealth()
        : apiClient.Services.getServiceHealth())
        .then((res: any) => extractData(res, 200))
      callStatus.value = 'ok'
    } catch {
      callStatus.value = 'error'
    }
  }

  const refreshServicesHealth = async () => {
    await apiClient.Services.refreshServiceHealth()
      .then((res: any) => extractData(res, 200))
    return checkServicesHealth()
  }

  const startHealthPolling = async () => {
    clear()
    await checkServicesHealth()
    interval = setInterval(() => {
      void checkServicesHealth()
    }, HEALTH_POLL_INTERVAL_MS)
  }

  const stopHealthPolling = () => {
    clear()
  }

  async function toggleDisplayCause() {
    displayCause.value = !displayCause.value
    await checkServicesHealth()
  }

  return {
    displayCause,
    servicesHealth,
    services,
    checkServicesHealth,
    refreshServicesHealth,
    toggleDisplayCause,
    startHealthPolling,
    stopHealthPolling,
  }
})
