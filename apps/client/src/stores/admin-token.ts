import { defineStore } from 'pinia'
import type { AdminToken, adminTokenContract } from '@cpn-console/shared'
import { apiClient, extractData } from '../api/xhr-client'

export const useAdminTokenStore = defineStore('adminToken', () => {
  const listTokens = async (query: typeof adminTokenContract.listAdminTokens.query._type = {}) => {
    return apiClient.AdminTokens.listAdminTokens({ query })
      .then(response => extractData(response, 200))
  }

  const createToken = async (body: typeof adminTokenContract.createAdminToken.body._type) => {
    return apiClient.AdminTokens.createAdminToken({ body })
      .then(res => extractData(res, 201))
  }

  const deleteToken = async (tokenId: AdminToken['id']) => {
    await apiClient.AdminTokens.deleteAdminToken({ params: { tokenId } })
      .then(res => extractData(res, 204))
  }

  return {
    listTokens,
    createToken,
    deleteToken,
  }
})
