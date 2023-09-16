import { StepCall } from '@/plugins/hooks/hook.js'
import axios from 'axios'
import { axiosOptions } from './index.js'
import { deletePrivilege, deleteRole } from './api.js'
const axiosInstance = axios.create(axiosOptions)

type Repository = {
  name: string
  format: string
  type: string
  url: string
  attributes: {
    proxy?: {
      remoteUrl?: string
    }
  }
}
type User = {
  userId: string
  firstName: string
  lastName: string
  emailAddress: string
  source: string
  status: 'active' | 'locked' | 'disabled' | 'changepassword'
  readOnly: boolean
  roles: string[]
  externalRoles: string[]
}
type Privilege = {
  type: string
  name: string
  description: string
  readOnly: boolean
  format: string
  repository: string
}
type Role = {
  id: string
  source: string
  name: string
  description: string
  readOnly: boolean
  privileges: string[]
  roles: string[]
}
type Get<Resource> = {
  data: Resource[]
}
export const purgeAll: StepCall<object> = async () => {
  const repositories = await axiosInstance({
    method: 'get',
    url: '/repositories',
  }) as Get<Repository>
  const users = await axiosInstance({
    method: 'get',
    url: '/security/users',
  }) as Get<User>
  const privileges = await axiosInstance({
    method: 'get',
    url: '/security/privileges',
  }) as Get<Privilege>
  const roles = await axiosInstance({
    method: 'get',
    url: '/security/roles',
  }) as Get<Role>

  const toDeleteRoles = roles.data
    .filter(role => role.description === 'desc')
  const toDeletePrivileges = privileges.data
    .filter(privilege => privilege.description.startsWith('Privilege for organization '))
  const toDeleteRepos = repositories.data
    .filter(repo => repo.name.match(/^.*-repository-(group|snapshot|release)$/))
  const toDeleteUsers = users.data
    .filter(user => user.firstName === 'Monkey D.' && user.lastName === 'Luffy')

  await Promise.all(
    toDeleteRoles.map(({ name }) => deleteRole(name)),
  )
  await Promise.all(
    toDeletePrivileges.map(({ name }) => deletePrivilege(name)),
  )
  await Promise.all(
    toDeleteRepos.map(({ name }) => deletePrivilege(name)),
  )
  await Promise.all(
    toDeleteUsers.map(({ userId }) => deletePrivilege(userId)),
  )

  return {
    status: {
      result: 'OK',
      message: 'Nexus purged',
    },
  }
}
