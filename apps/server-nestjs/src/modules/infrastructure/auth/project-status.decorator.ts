import type { ProjectContext } from './project.guard'
import { SetMetadata } from '@nestjs/common'

export const PROJECT_STATUS_KEY = 'project-status'

export function RequireProjectStatus(...statuses: ProjectContext['status'][]) {
  return SetMetadata(PROJECT_STATUS_KEY, statuses)
}
