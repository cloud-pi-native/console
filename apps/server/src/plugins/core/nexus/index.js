import { nexusUrl, nexusUser, nexusPassword } from '../../../utils/env.js'

console.log(nexusUrl);
export const axiosOptions = {
  baseURL: `${nexusUrl}service/rest/v1/`,
  auth: {
    username: nexusUser,
    password: nexusPassword,
  },
  headers: {
    Accept: 'application/json',
  },
}
