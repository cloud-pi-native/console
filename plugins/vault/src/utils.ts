import type { AxiosInstance } from 'axios'

export async function getAuthMethod(axiosInstance: AxiosInstance, token: string) {
  const response = await axiosInstance({
    method: 'get',
    url: '/v1/sys/auth',
    headers: { 'X-Vault-Token': token },
  })
  return response.data
}

export async function isAppRoleEnabled(axiosInstance: AxiosInstance, token: string) {
  const methods = await getAuthMethod(axiosInstance, token)
  return Object.keys(methods).includes('approle/')
}
