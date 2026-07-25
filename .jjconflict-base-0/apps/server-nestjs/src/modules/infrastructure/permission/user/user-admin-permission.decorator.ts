import type { AdminAuthorized } from '@cpn-console/shared'
import { SetMetadata } from '@nestjs/common'

export const ADMIN_PERMISSIONS_KEY = 'admin-permissions'

export function RequireAdminPermission(...permissions: (keyof typeof AdminAuthorized)[]) {
  return SetMetadata(ADMIN_PERMISSIONS_KEY, permissions)
}
