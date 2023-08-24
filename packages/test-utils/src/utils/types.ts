export type Organization = {
    id: string,
    name: string,
    label: string,
    source: string,
    active: boolean,
    createdAt: Date,
    updatedAt: Date,
}

export type UserProject = {
  id: string,
  role: string,
}

export type Repository = {
  id: string,
  projectId: string,
  internalRepoName: string,
  externalRepoUrl: string,
  isPrivate: boolean,
  isInfra: boolean,
  status: string,
  createdAt: Date,
  updatedAt: Date,
  externalUserName?: string,
  externalToken?: string,
}

export type User = {
  id: string,
  email: string,
  firstName: string,
  lastName: string,
}

export type Permission = {
  id: string,
  environmentId: string,
  userId: string,
  level: number,
  user: User,
}

export type Cluster = {
  id: string,
  label: string,
  projectsId: string[],
  user: {
    certData: string,
    keyData: string,
  },
  cluster: {
    caData: string,
    server: string,
    tlsServerName: string,
  },
  privacy: string,
  clusterResources: boolean,
  secretName: string,
}

export type Environment = {
  id: string,
  name: string,
  projectId: string,
  status: string,
  permissions?: Permission[],
  clusters?: Cluster[],
}

export type Log = {
  id: string,
  action: string,
  userId: string,
}

export type Project = {
  id: string
  name: string,
  organizationId: string,
  organization: Organization,
  description: string,
  status: string,
  locked: boolean,
  roles?: UserProject[],
  repositories?: Repository[],
  environments?: Environment[],
}
