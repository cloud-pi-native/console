import axios, { type AxiosInstance } from 'axios'
import { SearchProjectRes, SearchUserRes, SonarProject } from './types'

export type SonarUser = {
  login: string // unique key name
  name: string
  active: boolean
  email?: string
  groups: string[]
  tokenCount: number
  local: boolean
  externalIdentity: string
  externalProvider: string
  avatar?: string
  lastConnectionDate?: string
}
export class SonarApi {
  private axiosInstance: AxiosInstance

  constructor (baseURL: string, token: string) {
    this.axiosInstance = axios.create({
      baseURL: `${baseURL}/api/`,
      auth: {
        username: token,
        password: undefined, // Token is used, so password is useless
      },
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    })
  }

  // userGroups = {
  //   list: (login: string) => {
  //     const res = this.axiosInstance.get('user_groups/search', {
  //       params: {
  //         q: login,
  //       },
  //     }) as SearchUserRes
  //     return res.data.users
  //   },
  // }

  users = {
    delete: async (login: string, anonymize = true) => {
      this.axiosInstance({
        url: 'users/deactivate',
        params: {
          login,
          anonymize,
        },
        method: 'post',
      })
    },
    search: async (login: string):Promise<SonarUser | void> => {
      const res = await this.axiosInstance({
        url: 'users/search',
        params: {
          q: login,
        },
      })
      const user = res.data.users.find(u => u.login === login)
      return user
    },
    list: async (index = 1) => {
      let users = []
      const res = await this.axiosInstance({
        url: 'users/search',
        method: 'get',
        params: {
          p: index,
        },
      }) as SearchUserRes

      users = [...res.data.users]

      if (res.data.paging.pageIndex * res.data.paging.pageSize <= res.data.paging.total) {
        users = [...users, ...await this.users.list(index + 1)]
      }
      return users as SonarUser[]
    },
    changePassword: async (login: string, password: string) => this.axiosInstance({
      url: 'users/change_password',
      method: 'post',
      params: {
        login,
        password,
      },
    }),
    create: async ({ email, local, login, name, password }: {
      email: string,
      local: boolean,
      login: string,
      name: string,
      password: string
    }) => this.axiosInstance({
      url: 'users/create',
      method: 'post',
      params: {
        email,
        local,
        login,
        name,
        password,
      },
    }),
  }

  userTokens = {
    revoke: async (login: string, name: string) => this.axiosInstance({
      url: 'user_tokens/revoke',
      method: 'post',
      params: {
        login,
        name,
      },
    }),
    generate: async (login: string, name: string) => this.axiosInstance({
      url: 'user_tokens/generate',
      method: 'post',
      params: {
        login,
        name,
      },
    }),
  }

  projects = {
    search: async () => {},
    list: async (index = 1) => {
      let projects = []
      const res = await this.axiosInstance({
        url: 'projects/search',
        method: 'get',
        params: {
          p: index,
        },
      }) as SearchProjectRes
      projects = [...res.data.components]

      if (res.data.paging.pageIndex * res.data.paging.pageSize <= res.data.paging.total) {
        projects = [...projects, ...await this.projects.list(index + 1)]
      }
      return projects as SonarProject[]
    },
    create: async () => {},
    delete: async () => {},
    bulkDelete: async (keys: string[]) => this.axiosInstance({
      url: 'projects/bulk_delete',
      method: 'get',
      params: {
        projects: keys.join(','),
      },
    }),
  }
}
