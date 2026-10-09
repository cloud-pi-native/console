import type {
  CreatePersonalAccessTokenRequest,
  PersonalAccessToken,
} from '@cpn-console/shared'
import { defineStore } from 'pinia'
import { apiClient, extractData } from '../api/xhr-client.js'

export const useTokenStore = defineStore('token', () => {
  const listPersonalAccessTokens = async () => {
    return apiClient.PersonalAccessTokens.listPersonalAccessTokens().then(
      (response: any) => extractData(response, 200),
    )
  }

  const createPersonalAccessToken = async (
    body: CreatePersonalAccessTokenRequest,
  ) => {
    return apiClient.PersonalAccessTokens.createPersonalAccessToken({
      body,
    }).then((res: any) => extractData(res, 201))
  }

  const deletePersonalAccessToken = async (
    tokenId: PersonalAccessToken['id'],
  ) => {
    await apiClient.PersonalAccessTokens.deletePersonalAccessToken({
      params: { tokenId },
    }).then((res: any) => extractData(res, 204))
  }

  return {
    listPersonalAccessTokens,
    createPersonalAccessToken,
    deletePersonalAccessToken,
  }
})
