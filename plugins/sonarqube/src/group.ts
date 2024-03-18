import { parseError, type ArchiveProjectExecArgs, type CreateProjectExecArgs, type StepCall } from '@cpn-console/hooks'
import type { AxiosResponse } from 'axios'
import { getAxiosInstance } from './tech.js'
import type { SonarPaging } from './project.js'

export type SonarGroup = {
  id: string,
  name: string,
  description: string,
  membersCount: number,
  default: boolean
}

export const createDsoProjectGroup: StepCall<CreateProjectExecArgs> = async (payload) => {
  const { project, organization } = payload.args
  const groupName = `/${organization}-${project}`
  const axiosInstance = getAxiosInstance()

  try {
    let newGroup: undefined | AxiosResponse
    const group = await findGroupByName(groupName)
    if (!group) {
      newGroup = await axiosInstance({
        url: 'user_groups/create',
        method: 'post',
        params: {
          name: groupName,
        },
      })
    }
    return {
      ...payload.results.sonarqube,
      status: {
        result: 'OK',
        message: `User ${newGroup ? 're' : ''}created`,
      },
    }
  } catch (error) {
    return {
      error: parseError(error),
      status: {
        result: 'KO',
        // @ts-ignore prévoir une fonction générique
        message: error.message,
      },
    }
  }
}

export const deleteteDsoProjectGroup: StepCall<ArchiveProjectExecArgs> = async (payload) => {
  const { project, organization } = payload.args
  const axiosInstance = getAxiosInstance()
  const groupName = `/${organization}-${project}`
  let message: string
  try {
    const groupsSearch: { paging: SonarPaging, groups: SonarGroup[] } = (await axiosInstance({
      url: 'user_groups/search',
      params: {
        q: groupName,
      },
    }))?.data
    const group = groupsSearch.groups.find(g => g.name === groupName)
    if (group) {
      await axiosInstance({
        url: 'user_groups/delete',
        method: 'post',
        params: {
          name: groupName,
        },
      })
      message = 'Group deleted'
    } else message = 'Group already missing'
    return {
      ...payload.results.sonarqube,
      status: {
        result: 'OK',
        message,
      },
    }
  } catch (error) {
    return {
      error: parseError(error),
      status: {
        result: 'KO',
        // @ts-ignore prévoir une fonction générique
        message: error.message,
      },
    }
  }
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
