import type { Project } from '@prisma/client'
import { SetMetadata } from '@nestjs/common'

export const PROJECT_STATUS_KEY = 'project-status'

export function RequireProjectStatus(...statuses: Project['status'][]) {
  return SetMetadata(PROJECT_STATUS_KEY, statuses)
}
