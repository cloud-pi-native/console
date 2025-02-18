import type { Project, Repository } from './hook-project.js'
import type { Hook } from './hook.js'
import { createHook } from './hook.js'

// misc hooks
export type EmptyPayload = Record<string, never>

export const checkServices: Hook<EmptyPayload> = createHook()

// misc project related hooks
export type ProjectLite = Pick<Project, 'id' | 'name' | 'store' | 'slug'>

export const getProjectSecrets: Hook<ProjectLite> = createHook()

export type UniqueRepo = ProjectLite & { repo: Omit<Repository, 'newCreds'> & { syncAllBranches: boolean, branchName?: string } }
export const syncRepository: Hook<UniqueRepo> = createHook()
