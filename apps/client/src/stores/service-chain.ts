import { defineStore } from 'pinia'
import { ref } from 'vue'
import { resourceListToDict, type ServiceChainDetails, type ServiceChainList } from '@cpn-console/shared'
import { apiClient, extractData } from '@/api/xhr-client.js'

export const useServiceChainStore = defineStore('serviceChain', () => {
  const serviceChains = ref<ServiceChainList>([])
  const serviceChainsById = computed(() => resourceListToDict(serviceChains.value))

  const getServiceChainsList = async () => {
    serviceChains.value = await apiClient.ServiceChains.listServiceChains()
      .then(response => extractData(response, 200))
    return serviceChains.value
  }

  const getServiceChainDetails = async (serviceChainId: ServiceChainDetails['id']) =>
    apiClient.ServiceChains.getServiceChainDetails({ params: { serviceChainId } })
      .then(response => extractData(response, 200))

  return {
    serviceChains,
    serviceChainsById,
    getServiceChainDetails,
    getServiceChainsList,
  }
})
