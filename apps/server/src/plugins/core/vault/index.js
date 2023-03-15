import { vaultUrl, vaultToken } from '../../utils/env.js'

export const getToken = async () => {
  const tokenRes = await fetch(`${vaultUrl}v1/auth/token/create`, {
    method: 'POST',
    headers: {
      'X-Vault-Token': vaultToken,
    },
  })
  return (await tokenRes.json()).auth.client_token
}

export const readVault = async (path) => {
  const token = await getToken()
  const response = await fetch(`${vaultUrl}v1/forge-dso/data/${path.replace(/^\//, '')}`, {
    headers: {
      'X-Vault-Token': token,
    },
  })
  if (response.status < 200 || response.status >= 300) {
    throw Error(response.statusText)
  }
  return await response.json()
}

export const writeVault = async (path, body) => {
  const token = await getToken()
  const url = `${vaultUrl}v1/forge-dso/data/${path.replace(/^\//, '')}`
  const response = await fetch(url, {
    method: 'POST',
    body: JSON.stringify({ data: body }),
    headers: {
      'X-Vault-Token': token,
    },
  })
  if (response.status < 200 || response.status >= 300) {
    throw Error(response.statusText)
  }
  return await response.json()
}

export const destroyVault = async (path) => {
  const token = await getToken()
  const url = `${vaultUrl}v1/forge-dso/data/${path.replace(/^\//, '')}`
  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      'X-Vault-Token': token,
    },
  })
  if (response.status < 200 || response.status >= 300) {
    throw Error(response.statusText)
  }
  return response
}
