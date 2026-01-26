import type { Project } from '@cpn-console/hooks'
import type { UserSchema } from '@gitbeaker/core'
import { AccessLevel } from '@gitbeaker/core'
import type { GitlabProjectApi } from './gitlab-project-api.js'
import { upsertUser } from './user.js'

function getAccessLevel(role: string | undefined): number {
  switch (role) {
    case 'guest': return AccessLevel.GUEST
    case 'reporter': return AccessLevel.REPORTER
    case 'developer': return AccessLevel.DEVELOPER
    case 'maintainer': return AccessLevel.MAINTAINER
    case 'owner': return AccessLevel.OWNER
    default: return AccessLevel.DEVELOPER
  }
}

export async function ensureMembers(gitlabApi: GitlabProjectApi, project: Project) {
  // Ensure all users exists in gitlab
  const [gitlabUserPromiseResults, members] = await Promise.all([
    Promise.allSettled(project.users.map(user => upsertUser(user))),
    gitlabApi.getGroupMembers(),
  ])

  interface FulfilledResult { status: 'fulfilled', value: UserSchema }
  interface RejectedResult { status: 'rejected', reason: any }

  const fulfilledGitlabUsers = gitlabUserPromiseResults
    .filter<FulfilledResult>((result): result is FulfilledResult => result.status === 'fulfilled')

  const rejectedGitlabUsers = gitlabUserPromiseResults
    .filter<RejectedResult>((result): result is RejectedResult => result.status === 'rejected')

  // Ensure members are set
  const membersAdded = await Promise.all([
    ...project.users.map((user, index) => {
      const result = gitlabUserPromiseResults[index]
      if (result.status === 'rejected') return undefined
      const gitlabUser = result.value

      const userRole = project.roles.find(r => r.userId === user.id)?.role
      const accessLevel = getAccessLevel(userRole)
      const existingMember = members.find(member => member.id === gitlabUser.id)

      if (existingMember) {
        if (existingMember.access_level !== accessLevel) {
          return gitlabApi.editGroupMember(gitlabUser.id, accessLevel)
        }
        return undefined
      }
      return gitlabApi.addGroupMember(gitlabUser.id, accessLevel)
    }),
    ...members.map(member =>
      (
        !member.username.match(/group_\d+_bot/)
        && !fulfilledGitlabUsers.find(gitlabUser => member.id === gitlabUser.value.id)
      )
        ? gitlabApi.removeGroupMember(member.id)
        : undefined,
    ),
  ])
  return {
    members: [...members, membersAdded.filter(member => member)],
    failedInUpsertUsers: !!rejectedGitlabUsers.length,
  }
}
