import axios from 'axios'
import { axiosOptions } from './index.js'
import { projectPath } from '../../../utils/env.js'

const projectDir = projectPath.join('/')

export const getToken = async () => {
  const tokenRes = await axios({
    ...axiosOptions,
    url: '/v1/auth/token/create',
    method: 'POST',
  })

  return tokenRes.data.auth.client_token
}

export const readVault = async (path) => {
  const token = await getToken()
  const response = await axios({
    ...axiosOptions,
    url: `/v1/forge-dso/data/${projectDir}/${path}`,
    headers: {
      'X-Vault-Token': token,
    },
  })
  return await response.data
}

export const writeVault = async (path, body) => {
  const token = await getToken()
  const response = await axios({
    ...axiosOptions,
    url: `/v1/forge-dso/data/${projectDir}/${path}`,
    headers: {
      'X-Vault-Token': token,
    },
    method: 'post',
    data: { data: body },
  })
  return await response.data
}

export const destroyVault = async (path) => {
  const token = await getToken()
  const response = await axios({
    ...axiosOptions,
    url: `/v1/forge-dso/data/${projectDir}/${path}`,
    headers: {
      'X-Vault-Token': token,
    },
    method: 'delete',
  })
  return response
}
