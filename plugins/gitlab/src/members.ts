import type { Config, Project } from '@cpn-console/hooks'
import { specificallyEnabled } from '@cpn-console/hooks'
import type { UserSchema } from '@gitbeaker/core'
import type { GitlabProjectApi } from './class.js'
import { upsertUser } from './user.js'
import { resolveAccessLevel } from './utils.js'

export async function ensureMembers(gitlabApi: GitlabProjectApi, project: Project, config: Config) {
  const purge = config.gitlab?.purge

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

  const userAccessLevels = new Map<string, number>()
  for (const role of project.roles) {
    const accessLevel = resolveAccessLevel(project, role, config)

    if (accessLevel !== undefined) {
      for (const user of role.users) {
        const currentLevel = userAccessLevels.get(user.id)
        if (!currentLevel || accessLevel > currentLevel) {
          userAccessLevels.set(user.id, accessLevel)
        }
      }
    }
  }

  await Promise.all(fulfilledGitlabUsers.map(async (gitlabUser, index) => {
    const projectUser = project.users[index]
    if (!projectUser) return

    const accessLevel = userAccessLevels.get(projectUser.id)
    const existingMember = members.find(member => member.id === gitlabUser.value.id)

    if (accessLevel !== undefined) {
      if (existingMember) {
        if (existingMember.access_level !== accessLevel) {
          await gitlabApi.editGroupMember(gitlabUser.value.id, accessLevel)
        }
      } else {
        await gitlabApi.addGroupMember(gitlabUser.value.id, accessLevel)
      }
    } else if (specificallyEnabled(purge) && existingMember) {
      await gitlabApi.removeGroupMember(gitlabUser.value.id)
    }
  }))

  return {
    members,
    failedInUpsertUsers: !!rejectedGitlabUsers.length,
  }
}
