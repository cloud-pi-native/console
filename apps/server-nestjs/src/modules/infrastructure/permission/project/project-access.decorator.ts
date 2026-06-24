import { SetMetadata } from '@nestjs/common'

export const PROJECT_ACCESS_KEY = 'project-access'

export function RequireProjectAccess() {
  return SetMetadata(PROJECT_ACCESS_KEY, true)
}
