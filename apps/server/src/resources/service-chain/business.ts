import {
  getServiceChainDetails as getServiceChainDetailsQuery,
  listServiceChains as listServiceChainsQuery,
} from '@/resources/queries-index.js'

export async function listServiceChains() {
  return listServiceChainsQuery()
}

export async function getServiceChainDetails(serviceChainId: string) {
  return getServiceChainDetailsQuery(serviceChainId)
}
