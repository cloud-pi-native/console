import type { Organization, User } from './index.js'
import { type Hook, createHook } from './hook.js'

export type Project = string
export type ProjecBase = { organization: Organization, project: Project }
export type CreateProjectValidateArgs = { owner: User }
export type CreateProjectExecArgs = CreateProjectValidateArgs & ProjecBase
export type ArchiveProjectValidateArgs = ProjecBase
export type ArchiveProjectExecArgs = ProjecBase

export const createProject: Hook<CreateProjectExecArgs, CreateProjectValidateArgs> = createHook()
export const archiveProject: Hook<ArchiveProjectExecArgs, ArchiveProjectValidateArgs> = createHook()
