import type { Project } from './hook-project.js'
import type { Hook } from './hook.js'
import { createHook } from './hook.js'

export interface ProjectRole {
  id: string
  name: string
  permissions: string
  projectId: string
  position: number
  type?: string | undefined
  oidcGroup?: string | undefined
  project: Project
}

export const upsertProjectRole: Hook<ProjectRole> = createHook()
export const deleteProjectRole: Hook<ProjectRole> = createHook()
