import type { ProjectMember, ProjectRole } from '@cpn-console/shared'
import type { Hook } from './hook.js'
import { createHook } from './hook.js'

export type ProjectMemberPayload = ProjectMember & {
  roles: ProjectRole[]
  project: { id: string, slug: string }
  environments: {
    id: string
    name: string
    permissions: {
      ro: boolean
      rw: boolean
    }
  }[]
}

export const upsertProjectMember: Hook<ProjectMemberPayload> = createHook()
export const deleteProjectMember: Hook<ProjectMemberPayload> = createHook()
