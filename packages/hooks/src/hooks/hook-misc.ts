import { Project, Repository } from './hook-project.js'
import { Hook, createHook } from './hook.js'

// misc hooks
export type EmptyPayload = Record<string, never>

export const checkServices: Hook<EmptyPayload, EmptyPayload> = createHook()
export const fetchOrganizations: Hook<EmptyPayload, EmptyPayload> = createHook(true)

// misc project related hooks
export type ProjectLite = Pick<Project, 'id' | 'name' | 'organization' | 'store'>

export const getProjectSecrets: Hook<ProjectLite, ProjectLite> = createHook()

export type UniqueRepo = ProjectLite & { repo: Omit<Repository, 'newCreds'> & { branchName: string } }
export const syncRepository: Hook<UniqueRepo, UniqueRepo> = createHook()
