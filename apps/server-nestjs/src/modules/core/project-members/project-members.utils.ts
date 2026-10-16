import type { Member } from '@cpn-console/shared'
import type { ProjectMemberWithUser } from './project-members-queries.utils'

export function generateProjectMember(member: ProjectMemberWithUser): Member {
  const { roleIds, user } = member
  return {
    userId: user.id,
    roleIds,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
  }
}
