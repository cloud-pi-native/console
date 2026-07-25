import type { ProjectRole } from './hook-project-role.js'
import type { Project } from './hook-project.js'
import type { Hook } from './hook.js'
import { createHook } from './hook.js'

export interface ProjectMember {
  userId: string
  email: string
  firstName: string
  lastName: string
  roles: ProjectRole[]
  project: Project
}

export const upsertProjectMember: Hook<ProjectMember> = createHook()
export const deleteProjectMember: Hook<ProjectMember> = createHook()
