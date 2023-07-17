import { UserModel, ProjectModel } from 'shared'
import type { Organization } from './index.js'
import { type Hook, createHook } from './hook.js'

export type Project = string
export type ProjectBase = { organization: Organization, project: Project }
export type ProjectInfos = { description: string, status: ProjectModel['status'] }
export type CreateProjectValidateArgs = { owner: UserModel }
export type CreateProjectExecArgs = CreateProjectValidateArgs & ProjectBase & ProjectInfos
export type ArchiveProjectValidateArgs = ProjectBase
export type ArchiveProjectExecArgs = ProjectBase

export const createProject: Hook<CreateProjectExecArgs, CreateProjectValidateArgs> = createHook()
export const archiveProject: Hook<ArchiveProjectExecArgs, ArchiveProjectValidateArgs> = createHook()
