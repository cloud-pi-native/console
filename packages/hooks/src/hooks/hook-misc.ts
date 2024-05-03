import { Project, Repository } from './hook-project.js'
import { Hook, createHook } from './hook.js'
import { UserObject } from './index.js'

// misc hooks
export type EmptyPayload = Record<string, never>
export type UserLite = Pick<UserObject, 'email'>

export const checkServices: Hook<EmptyPayload, EmptyPayload> = createHook()
export const fetchOrganizations: Hook<EmptyPayload, EmptyPayload> = createHook(true)
export const retrieveUserByEmail: Hook<UserLite, UserLite> = createHook()

// misc project related hooks
export type ProjectLite = Pick<Project, 'id' | 'name' | 'organization' | 'store'>

export const getProjectSecrets: Hook<ProjectLite, ProjectLite> = createHook()

export type UniqueRepo = ProjectLite & { repo: Omit<Repository, 'newCreds'> & { branchName: string } }
export const syncRepository: Hook<UniqueRepo, UniqueRepo> = createHook()
