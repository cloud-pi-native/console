import axios from 'axios'
import { axiosOptions } from './index.js'
const axiosInstance = axios.create(axiosOptions)

export const deleteRole = (name: string) => axiosInstance({
  method: 'delete',
  url: `/security/roles/${name}`,
  validateStatus: code => code === 404 || code < 300,
})

export const deletePrivilege = (name: string) => axiosInstance({
  method: 'delete',
  url: `/security/roles/${name}`,
  validateStatus: code => code === 404 || code < 300,
})

export const deleteRepo = (name: string) => axiosInstance({
  method: 'delete',
  url: `/repositories/${name}`,
  validateStatus: code => code === 404 || code < 300,
})

export const deleteUser = (userId: string) => axiosInstance({
  method: 'delete',
  url: `/security/users/${userId}`,
  validateStatus: code => code === 404 || code < 300,
})
