import type { ProjectRole } from './hook-project-role.ts'
import type { Project } from './hook-project.ts'
import type { Hook } from './hook.ts'
import { createHook } from './hook.ts'

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
