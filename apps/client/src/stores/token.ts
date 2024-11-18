import { defineStore } from 'pinia'
import type { PersonalAccessToken, personalAccessTokenContract } from '@cpn-console/shared'
import { apiClient, extractData } from '../api/xhr-client.js'

export const useTokenStore = defineStore('token', () => {
  const listPersonalAccessTokens = async () => {
    return apiClient.PersonalAccessTokens.listPersonalAccessTokens()
      .then(response => extractData(response, 200))
  }

  const createPersonalAccessToken = async (body: typeof personalAccessTokenContract.createPersonalAccessToken.body._type) => {
    return apiClient.PersonalAccessTokens.createPersonalAccessToken({ body })
      .then(res => extractData(res, 201))
  }

  const deletePersonalAccessToken = async (tokenId: PersonalAccessToken['id']) => {
    await apiClient.PersonalAccessTokens.deletePersonalAccessToken({ params: { tokenId } })
      .then(res => extractData(res, 204))
  }

  return {
    listPersonalAccessTokens,
    createPersonalAccessToken,
    deletePersonalAccessToken,
  }
})
