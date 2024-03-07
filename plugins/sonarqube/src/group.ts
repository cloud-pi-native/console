import { getAxiosInstance } from './tech.js'
import type { SonarPaging } from './project.js'

export type SonarGroup = {
  id: string,
  name: string,
  description: string,
  membersCount: number,
  default: boolean
}

export const findGroupByName = async (name: string): Promise<void | SonarGroup> => {
  const axiosInstance = getAxiosInstance()
  const groupsSearch: { paging: SonarPaging, groups: SonarGroup[] } = (await axiosInstance({
    url: 'user_groups/search',
    params: {
      q: name,
    },
  }))?.data
  return groupsSearch.groups.find(g => g.name === name)
}

export const ensureGroupExists = async (groupName: string) => {
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
