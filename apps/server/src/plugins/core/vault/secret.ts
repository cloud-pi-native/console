import axios from 'axios'
import { axiosOptions } from './index.js'
import { projectRootDir } from '@/utils/env.js'

const projectDir = projectRootDir

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
  return await response.data.data
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
    url: `/v1/forge-dso/metadata/${projectDir}/${path}`,
    headers: {
      'X-Vault-Token': token,
    },
    method: 'delete',
  })
  return response
}

export const listVault = async (path) => {
  const listSecretPath = []
  const token = await getToken()
  const response = await axios({
    ...axiosOptions,
    url: `/v1/forge-dso/metadata/${projectDir}/${path}`,
    headers: {
      'X-Vault-Token': token,
    },
    method: 'list',
    validateStatus: (code) => [200, 404].includes(code),
  })
  if (response.status === 404) { return listSecretPath }
  for (const key of response.data.data.keys) {
    if (key.endsWith('/')) {
      const subSecrets = await listVault(`${path}/${key}`)
      subSecrets.forEach(secret => {
        listSecretPath.push(`${key}${secret}`)
      })
    } else {
      listSecretPath.push(key)
    }
  }
  return listSecretPath.flat(-1)
}
