export enum AccessLevel {
  NO_ACCESS = 0,
  MINIMAL_ACCESS = 5,
  GUEST = 10,
  REPORTER = 20,
  DEVELOPER = 30,
  MAINTAINER = 40,
  OWNER = 50,
}

export type Visibility = 'private' | 'internal' | 'public'

export interface OffsetPagination {
  next: number | null
}

export interface GitlabListResponse<T> {
  data: T[]
  paginationInfo: OffsetPagination
}

export interface GroupSchema {
  id: number
  name: string
  path?: string
  full_path?: string
  fullPath?: string
  parent_id?: number | null
  parentId?: number | null
}

export interface ProjectSchema {
  id: number
  name: string
  path: string
  path_with_namespace?: string
  pathWithNamespace?: string
  topics?: string[] | null
}

export type CondensedProjectSchema = ProjectSchema

export interface SimpleUserSchema {
  id: number
  name: string
  username: string
  email?: string
  extern_uid?: string | null
  externUid?: string | null
  provider?: string | null
  admin?: boolean
  auditor?: boolean
}

export interface MemberSchema {
  id: number
  username: string
  access_level: number
  accessLevel?: number
}

export interface VariableSchema {
  key: string
  value: string
  variable_type: 'env_var' | 'file'
  variableType?: 'env_var' | 'file'
  protected: boolean
  masked: boolean
  environment_scope?: string
  environmentScope?: string
}

export interface ProjectVariableSchema extends VariableSchema {
  environment_scope: string
}

export interface CommitAction {
  action: 'create' | 'delete' | 'move' | 'update' | 'chmod'
  file_path: string
  previous_path?: string
  content?: string
  encoding?: string
  last_commit_id?: string
  execute_filemode?: boolean
}

export interface BranchSchema {
  name: string
}

export interface RepositoryFileExpandedSchema {
  content_sha256?: string
}

export interface GroupAccessTokenSchema {
  id: number
  name: string
}

export interface GroupAccessTokenCreateResponse extends GroupAccessTokenSchema {
  token: string
}

export interface PipelineTriggerTokenSchema {
  id: number
  description: string
  token: string
}

export interface PipelineSchema {
  id: number
}
