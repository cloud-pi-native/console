import { ClusterModel, EnvironmentModel, OrganizationModel, ProjectModel, RepositoryModel, RoleModel } from '../resources/index.js'

export type ErrorTypes = 'info' | 'warning' | 'error' | 'success'

export type UserProfile = {
  email: string,
  id: string,
  firstName: string,
  lastName: string,
  groups: string[],
}

export type ProjectInfos = Omit<ProjectModel, 'roles'> & {
  organization?: OrganizationModel[],
  roles: RoleModel[],
  clusters?: ClusterModel[],
  repositories?: RepositoryModel[],
  environments?: EnvironmentModel[],
}
