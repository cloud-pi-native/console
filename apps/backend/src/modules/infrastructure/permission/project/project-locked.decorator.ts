import { SetMetadata } from '@nestjs/common'

export const PROJECT_LOCKED_KEY = 'project-locked'

export function RequireProjectLocked(locked: boolean) {
  return SetMetadata(PROJECT_LOCKED_KEY, locked)
}
