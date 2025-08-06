import {
  getServiceChainDetails as getServiceChainDetailsQuery,
  listServiceChains as listServiceChainsQuery,
  retryServiceChain as retryServiceChainQuery,
  validateServiceChain as validateServiceChainQuery,
} from '@/resources/queries-index.js'

export async function listServiceChains() {
  return listServiceChainsQuery()
}

export async function getServiceChainDetails(serviceChainId: string) {
  return getServiceChainDetailsQuery(serviceChainId)
}

export async function retryServiceChain(serviceChainId: string) {
  return retryServiceChainQuery(serviceChainId)
}

export async function validateServiceChain(validationId: string) {
  return validateServiceChainQuery(validationId)
}
