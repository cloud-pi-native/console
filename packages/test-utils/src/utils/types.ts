export type Organization = {
    id: string,
    name: string,
    label: string,
    source: string,
    active: boolean,
    createdAt?: Date,
    updatedAt?: Date,
}

export type Repository = {
  id: string,
  projectId: string,
  internalRepoName: string,
  externalRepoUrl: string,
  isPrivate: boolean,
  isInfra: boolean,
  status: string,
  createdAt?: Date,
  updatedAt?: Date,
  externalUserName?: string,
  externalToken?: string,
}

export type User = {
  id: string,
  email: string,
  firstName: string,
  lastName: string,
  updatedAt?: Date,
  createdAt?: Date,
}

export type Role = {
  userId: string,
  projectId: string,
  role: string,
  updatedAt?: Date,
  createdAt?: Date,
  user?: User,
}

export type Permission = {
  id: string,
  environmentId: string,
  userId: string,
  level: number,
  user: User,
  updatedAt?: Date,
  createdAt?: Date,
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
  updatedAt?: Date,
  createdAt?: Date,
}

export type Environment = {
  id: string,
  name: string,
  projectId: string,
  status: string,
  permissions?: Permission[],
  clusters?: Cluster[],
  updatedAt?: Date,
  createdAt?: Date,
}

export type Log = {
  id: string,
  action: string,
  userId: string,
  updatedAt?: Date,
  createdAt?: Date,
}

export type Project = {
  id: string
  name: string,
  organizationId: string,
  organization: Organization,
  description: string,
  status: string,
  locked: boolean,
  roles?: Role[],
  clusters?: Cluster[],
  repositories?: Repository[],
  environments?: Environment[],
  updatedAt?: Date,
  createdAt?: Date,
}
