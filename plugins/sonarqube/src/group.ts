import { getAxiosInstance } from './tech.js'
import type { SonarPaging } from './project.js'

export async function getGroupMembers(groupName: string): Promise<string[]> {
  const axiosInstance = getAxiosInstance()
  const usersSearch: { paging: SonarPaging, users: { login: string }[] } = (await axiosInstance({
    url: 'user_groups/users',
    params: {
      name: groupName,
      ps: 500, // Max page size usually, we might need pagination if > 500
    },
  }))?.data
  // Note: For simplicity assuming < 500 admins. If more, we need pagination loop.
  return usersSearch.users.map(u => u.login)
}
export interface SonarGroup {
  id: string
  name: string
  description: string
  membersCount: number
  default: boolean
}

export async function findGroupByName(name: string): Promise<void | SonarGroup> {
  const axiosInstance = getAxiosInstance()
  const groupsSearch: { paging: SonarPaging, groups: SonarGroup[] } = (await axiosInstance({
    url: 'user_groups/search',
    params: {
      q: name,
    },
  }))?.data
  return groupsSearch.groups.find(g => g.name === name)
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
