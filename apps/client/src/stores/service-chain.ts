import { defineStore } from 'pinia'
import { ref } from 'vue'
import { resourceListToDict, type CleanedServiceChain, type ServiceChain } from '@cpn-console/shared'
import { apiClient, extractData } from '@/api/xhr-client.js'

export const useServiceChainStore = defineStore('serviceChain', () => {
  const serviceChains = ref<Array<CleanedServiceChain>>([])
  const serviceChainsById = computed(() => resourceListToDict(serviceChains.value))

  const getServiceChains = async () => {
    serviceChains.value = await apiClient.ServiceChains.listServiceChains()
      .then(response => extractData(response, 200))
    return serviceChains.value
  }

  const getServiceChainDetails = async (serviceChainId: ServiceChain['id']) =>
    apiClient.ServiceChains.getServiceChainDetails({ params: { serviceChainId } })
      .then(response => extractData(response, 200))

  return {
    serviceChains,
    serviceChainsById,
    getServiceChainDetails,
    getServiceChains,
  }
})
