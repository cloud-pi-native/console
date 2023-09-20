import { ClusterModel, EnvironmentModel, OrganizationModel, ProjectModel, RepositoryModel, RoleModel } from '../resources/index.js'

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
  clusters?: ClusterModel[],
  repositories?: RepositoryModel[],
  environments?: EnvironmentModel[],
}
