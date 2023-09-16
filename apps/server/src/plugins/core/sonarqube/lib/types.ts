export type SonarUser = {
  login: string
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
export type SearchUserRes = {
  data: {
    paging: {
      total: number
      pageIndex: number
      pageSize: number
    },
    users: SonarUser[]
  }
}

export type SonarGroup = {
  id: string,
  name: string,
  description: string,
  membersCount: number,
  default: boolean
}

export type Qualifiers =
  'BRC' | // - Sub - projects
  'DIR' | // - Directories
  'FIL' | // - Files
  'TRK' | // - Projects
  'UTS' // - Test Files

export type SonarProject = {
  key: string // unique key name
  name: string
  qualifier: Qualifiers
  visibility: 'private' | 'public'
  lastAnalysisDate?: string
  revision?: string
}
export type SearchProjectRes = {
  data: {
    paging: {
      total: number
      pageIndex: number
      pageSize: number
    },
    components: SonarProject[]
  }
}
export type CreateProjectRes = {
  data: {
    project: SonarProject
  }
}
