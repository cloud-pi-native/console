import { Project } from '@cpn-console/hooks'
import type { GitlabProjectApi } from './class.js'
import { upsertUser } from './user.js'

export const ensureMembers = async (gitlabApi: GitlabProjectApi, project: Project) => {
  // Ensure all users exists in gitlab
  const gitlabUsers = await Promise.all(project.users.map(user => upsertUser(user)))

  const members = await gitlabApi.getGroupMembers()

  // Ensure members are set
  for (const gitlabUser of gitlabUsers) { // add missings
    if (!members.find(member => member.id === gitlabUser.id)) await gitlabApi.addGroupMember(gitlabUser.id)
  }
  for (const member of members) { // remove intruders
    if (member.username.match(/group_[0-9]+_bot/)) continue
    if (!gitlabUsers.find(gitlabUser => member.id === gitlabUser.id)) await gitlabApi.removeGroupMember(member.id)
  }

  return gitlabApi.getGroupMembers()
}
