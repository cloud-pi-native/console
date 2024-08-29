import type { Project } from '@cpn-console/hooks'
import type { GitlabProjectApi } from './class.js'
import { upsertUser } from './user.js'

export async function ensureMembers(gitlabApi: GitlabProjectApi, project: Project) {
  // Ensure all users exists in gitlab
  const [gitlabUsers, members] = await Promise.all([
    Promise.all(project.users.map(user => upsertUser(user))),
    gitlabApi.getGroupMembers(),
  ])

  // Ensure members are set
  const membersAdded = await Promise.all([
    ...gitlabUsers.map(gitlabUser =>
      members.find(member => member.id === gitlabUser.id)
        ? undefined
        : gitlabApi.addGroupMember(gitlabUser.id),
    ),
    ...members.map(member =>
      (
        !member.username.match(/group_\d+_bot/)
        && !gitlabUsers.find(gitlabUser => member.id === gitlabUser.id)
      )
        ? gitlabApi.removeGroupMember(member.id)
        : undefined,
    ),
  ])
  return [...members, membersAdded.filter(member => member)]
}
