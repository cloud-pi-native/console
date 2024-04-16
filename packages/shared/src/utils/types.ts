import { Cluster, Environment, Organization, Project, Repo, Role } from '../index.js'

export type ErrorTypes = 'info' | 'warning' | 'error' | 'success'

export type UserProfile = {
  email: string,
  id: string,
  firstName: string,
  lastName: string,
  groups: string[],
}

export type ProjectInfos = Omit<Project, 'roles'> & {
  organization?: Organization[],
  roles: Role[],
  clusters?: Cluster[],
  repositories?: Repo[],
  environments?: Environment[],
}
