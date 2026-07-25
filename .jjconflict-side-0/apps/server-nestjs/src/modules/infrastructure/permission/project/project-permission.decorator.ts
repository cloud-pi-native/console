import type { ProjectAuthorized } from '@cpn-console/shared'
import { SetMetadata } from '@nestjs/common'

export const PROJECT_PERMISSION_KEY = 'project-permission'

export function RequireProjectPermission(...permissions: (keyof typeof ProjectAuthorized)[]) {
  return SetMetadata(PROJECT_PERMISSION_KEY, permissions)
}
