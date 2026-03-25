import type { Project } from './hook-project.ts'
import type { Hook } from './hook.ts'
import { createHook } from './hook.ts'

export interface ProjectRole {
  id: string
  name: string
  permissions: string
  projectId: string
  position: number
  type?: string
  oidcGroup?: string
  project: Project
}

export const upsertProjectRole: Hook<ProjectRole> = createHook()
export const deleteProjectRole: Hook<ProjectRole> = createHook()
