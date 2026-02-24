import type { Project } from '@cpn-console/hooks'
import { AccessLevel, type UserSchema } from '@gitbeaker/core'
import type { GitlabProjectApi } from './class.js'
import { upsertUser } from './user.js'

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
    ...fulfilledGitlabUsers.map((gitlabUser) => {
      const user = project.users.find(user => user.email === gitlabUser.value.email)
      const isOwner = project.roles.find(role => role.userId === user?.id)?.role === 'owner'
      return members.find(member => member.id === gitlabUser.value.id)
        ? undefined
        : gitlabApi.addGroupMember(gitlabUser.value.id, isOwner ? AccessLevel.OWNER : AccessLevel.DEVELOPER)
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
