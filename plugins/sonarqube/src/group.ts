import { getAxiosInstance } from './tech.js'
import type { SonarPaging } from './project.js'
import { find, getAll, iter } from './utils.js'

export async function getGroupMembers(groupName: string): Promise<string[]> {
  const axiosInstance = getAxiosInstance()
  const users = await getAll<{ login: string }>(iter(async (page, pageSize) => {
    const response = await axiosInstance({
      url: 'user_groups/users',
      params: {
        name: groupName,
        p: page,
        ps: pageSize,
      },
    })
    const data: { paging: SonarPaging, users: { login: string }[] } = response.data
    return {
      items: data.users,
      paging: data.paging,
    }
  }))
  return users.map(u => u.login)
}
export interface SonarGroup {
  id: string
  name: string
  description: string
  membersCount: number
  default: boolean
}

export async function findGroupByName(name: string): Promise<SonarGroup | undefined> {
  const axiosInstance = getAxiosInstance()
  return find<SonarGroup>(iter(async (page, pageSize) => {
    const response = await axiosInstance({
      url: 'user_groups/search',
      params: {
        q: name,
        p: page,
        ps: pageSize,
      },
    })
    const data: { paging: SonarPaging, groups: SonarGroup[] } = response.data
    return {
      items: data.groups,
      paging: data.paging,
    }
  }), group => group.name === name)
}

export async function ensureGroupExists(groupName: string) {
  const axiosInstance = getAxiosInstance()
  const group = await findGroupByName(groupName)
  if (!group) {
    await axiosInstance({
      url: 'user_groups/create',
      method: 'post',
      params: {
        name: groupName,
      },
    })
  }
}

export async function addUserToGroup(groupName: string, login: string) {
  const axiosInstance = getAxiosInstance()
  await axiosInstance({
    url: 'user_groups/add_user',
    method: 'post',
    params: {
      name: groupName,
      login,
    },
  })
}

export async function removeUserFromGroup(groupName: string, login: string) {
  const axiosInstance = getAxiosInstance()
  await axiosInstance({
    url: 'user_groups/remove_user',
    method: 'post',
    params: {
      name: groupName,
      login,
    },
  })
}
