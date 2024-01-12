import type { Organization, UserObject } from './index.js'
import { type Hook, createHook } from './hook.js'

export type Project = string
export type ProjectBase = { organization: Organization, project: Project }
export type CreateProjectValidateArgs = { owner: UserObject }
export type CreateProjectExecArgs = CreateProjectValidateArgs & ProjectBase & { description: string }
export type UpdateProjectValidateArgs = ProjectBase & { description: string, status: string }
export type UpdateProjectExecArgs = ProjectBase & { description: string, status: string }
export type ArchiveProjectValidateArgs = ProjectBase
export type ArchiveProjectExecArgs = ProjectBase & { status: string, owner: UserObject }
export type GetProjectSecretsExecArgs = ProjectBase

export const createProject: Hook<CreateProjectExecArgs, CreateProjectValidateArgs> = createHook()
export const updateProject: Hook<UpdateProjectExecArgs, UpdateProjectValidateArgs> = createHook()
export const archiveProject: Hook<ArchiveProjectExecArgs, ArchiveProjectValidateArgs> = createHook()
export const getProjectSecrets: Hook<GetProjectSecretsExecArgs, ProjectBase> = createHook()
