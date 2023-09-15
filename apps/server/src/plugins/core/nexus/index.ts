import { removeTrailingSlash } from '@dso-console/shared'

export const nexusUrl = removeTrailingSlash(process.env.NEXUS_URL)
const nexusUser = process.env.NEXUS_ADMIN
const nexusPassword = process.env.NEXUS_ADMIN_PASSWORD

export const axiosOptions = {
  baseURL: `${nexusUrl}/service/rest/v1/`,
  auth: {
    username: nexusUser,
    password: nexusPassword,
  },
  headers: {
    Accept: 'application/json',
  },
}
