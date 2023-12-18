import { JSONSchema7 } from 'json-schema'
import { SensitiveClusterModel, EnvironmentModel, OrganizationModel, ProjectModel, RepositoryModel, RoleModel } from '../resources/index.js'

export type ErrorTypes = 'info' | 'warning' | 'error' | 'success'

export type UserProfile = {
  email: string | string[],
  id: string | string[],
  firstName: string | string[],
  lastName: string | string[],
  groups: string | string[],
}

export type ProjectInfos = ProjectModel & {
  organization?: OrganizationModel[],
  roles?: RoleModel[],
  clusters?: SensitiveClusterModel[],
  repositories?: RepositoryModel[],
  environments?: EnvironmentModel[],
}

export type RouteSchema = {
  $id?: string
  description: string
  tags: readonly string[]
  summary: string
  example?: string
  params?: JSONSchema7
  query?: JSONSchema7
  body?: JSONSchema7
  response: Record<number, JSONSchema7>
}

export type Mutable<T> = {
  -readonly [P in keyof T]: T[P];
}

export type Readonly<T> = {
  readonly [P in keyof T]: T[P];
}
