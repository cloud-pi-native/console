import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  ServiceChainDetailsSchema,
  ServiceChainFlowsSchema,
  resourceListToDict,
  type ServiceChain,
  type ServiceChainList,
} from '@cpn-console/shared'
import { apiClient, extractData } from '@/api/xhr-client.js'

export const useServiceChainStore = defineStore('serviceChain', () => {
  const serviceChains = ref<ServiceChainList>([])
  const serviceChainsById = computed(() =>
    resourceListToDict(serviceChains.value),
  )

  const getServiceChainsList = async () => {
    serviceChains.value
      = await apiClient.ServiceChains.listServiceChains().then((response: any) =>
        extractData(response, 200),
      )
    return serviceChains.value
  }

  const getServiceChainDetails = async (serviceChainId: ServiceChain['id']) =>
    apiClient.ServiceChains.getServiceChainDetails({
      params: { serviceChainId },
    }).then((response: any) =>
      ServiceChainDetailsSchema.parse(extractData(response, 200)),
    )

  const getServiceChainFlows = async (serviceChainId: ServiceChain['id']) =>
    apiClient.ServiceChains.getServiceChainFlows({
      params: { serviceChainId },
    }).then((response: any) =>
      ServiceChainFlowsSchema.parse(extractData(response, 200)),
    )

  const retryServiceChain = async (serviceChainId: ServiceChain['id']) =>
    apiClient.ServiceChains.retryServiceChain({
      params: { serviceChainId },
    })

  return {
    serviceChains,
    serviceChainsById,
    getServiceChainDetails,
    getServiceChainFlows,
    getServiceChainsList,
    retryServiceChain,
  }
})
