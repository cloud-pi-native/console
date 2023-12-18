import { ProjectModel } from '@dso-console/shared'
import type { Organization } from './index.js'
import { type Hook, createHook } from './hook.js'
import type { User } from '@prisma/client'

export type Project = string
export type ProjectBase = { organization: Organization, project: Project }
export type CreateProjectValidateArgs = { owner: User }
export type CreateProjectExecArgs = CreateProjectValidateArgs & ProjectBase & { description: string }
export type UpdateProjectValidateArgs = ProjectBase & { description: string, status: ProjectModel['status'] }
export type UpdateProjectExecArgs = ProjectBase & { description: string, status: ProjectModel['status'] }
export type ArchiveProjectValidateArgs = ProjectBase
export type ArchiveProjectExecArgs = ProjectBase & { status: ProjectModel['status'], owner: User }

export const createProject: Hook<CreateProjectExecArgs, CreateProjectValidateArgs> = createHook()
export const updateProject: Hook<UpdateProjectExecArgs, UpdateProjectValidateArgs> = createHook()
export const archiveProject: Hook<ArchiveProjectExecArgs, ArchiveProjectValidateArgs> = createHook()
export const getProjectSecrets: Hook<ProjectBase, ProjectBase> = createHook()
