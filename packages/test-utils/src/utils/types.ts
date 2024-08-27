export interface Organization {
  id: string
  name: string
  label: string
  source: string
  active: boolean
  createdAt?: Date | string
  updatedAt?: Date | string
}

export interface Repository {
  id: string
  projectId: string
  internalRepoName: string
  externalRepoUrl: string
  isPrivate: boolean
  isInfra: boolean
  createdAt?: Date
  updatedAt?: Date
  externalUserName?: string
  externalToken?: string
}

export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  updatedAt?: Date
  createdAt?: Date
}

export interface Role {
  userId: string
  projectId: string
  role: string
  updatedAt?: Date
  createdAt?: Date
  user?: User
}

export interface Member {
  userId: User['id']
  role: string
}

export interface Permission {
  id: string
  environmentId: string
  userId: string
  level: number
  user: User
  updatedAt?: Date
  createdAt?: Date
}

export interface Cluster {
  id: string
  label: string
  infos?: string
  projectIds?: string[]
  stageIds?: string[]
  zoneId?: string
  user: {
    certData: string
    keyData: string
  }
  cluster: {
    caData: string
    server: string
    tlsServerName: string
  }
  privacy: string
  clusterResources: boolean
  secretName: string
  updatedAt?: Date
  createdAt?: Date
}

export interface Environment {
  id: string
  name: string
  projectId: string
  clusterId: string
  quotaId: string
  stageId: string
  permissions?: Permission[]
  cluster?: Cluster
  updatedAt?: Date
  createdAt?: Date
}

export interface Log {
  id: string
  action: string
  userId: string
  createdAt: Date | string
  updatedAt: Date | string
  data: {
    args: any
    failed: boolean
    results: any
    totalExecutionTime: number
  }
  requestId: null
}

export interface Project {
  id: string
  name: string
  organizationId: string
  description: string
  status: string
  locked: boolean
  organization?: Organization
  roles?: Role[]
  clusters?: Cluster[]
  repositories?: Repository[]
  environments?: Environment[]
  updatedAt?: Date | string
  createdAt?: Date | string
}
