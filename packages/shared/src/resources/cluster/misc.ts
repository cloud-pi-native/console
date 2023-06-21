import type { User } from '@kubernetes/client-node'
export type { Cluster } from '@kubernetes/client-node'

export type ClusterPrivacy = 'public' | 'dedicated'

export type UserAuthBasic = Required<Pick<User, 'username' | 'password'>>
export type UserAuthToken = Required<Pick<User, 'token'>>
export type UserAuthCerts = Required<Pick<User, 'certData' | 'keyData'>>
