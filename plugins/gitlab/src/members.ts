import type { Config, Project, UserObject } from '@cpn-console/hooks'
import type { GitlabProjectApi } from './class.ts'
import { AccessLevel } from '@gitbeaker/core'
import {
  DEFAULT_PROJECT_DEVELOPER_GROUP_PATH_SUFFIX,
  DEFAULT_PROJECT_MAINTAINER_GROUP_PATH_SUFFIX,
  DEFAULT_PROJECT_REPORTER_GROUP_PATH_SUFFIX,
} from './infos.ts'
import { createUsername, upsertUser } from './user.ts'
import { matchRole } from './utils.ts'

export function getGroupAccessLevelFromProjectRole(project: Project, user: UserObject, config: Config) {
  const projectReporterGroupPathSuffixes = (config.gitlab?.projectReporterGroupPathSuffix ?? DEFAULT_PROJECT_REPORTER_GROUP_PATH_SUFFIX).split(',')
  const projectDeveloperGroupPathSuffixes = (config.gitlab?.projectDeveloperGroupPathSuffix ?? DEFAULT_PROJECT_DEVELOPER_GROUP_PATH_SUFFIX).split(',')
  const projectMaintainerGroupPathSuffixes = (config.gitlab?.projectMaintainerGroupPathSuffix ?? DEFAULT_PROJECT_MAINTAINER_GROUP_PATH_SUFFIX).split(',')

  const getAccessLevel = (role: any): number | null => {
    if (!role.oidcGroup) return null
    if (matchRole(project.slug, role.oidcGroup, projectReporterGroupPathSuffixes)) return AccessLevel.REPORTER
    if (matchRole(project.slug, role.oidcGroup, projectDeveloperGroupPathSuffixes)) return AccessLevel.DEVELOPER
    if (matchRole(project.slug, role.oidcGroup, projectMaintainerGroupPathSuffixes)) return AccessLevel.MAINTAINER
    return null
  }

  return project.roles.reduce<number | null>((highestAccessLevel, role) => {
    if (role.users.some(userRole => userRole.id === user.id)) {
      const level = getAccessLevel(role)
      if (level && level > (highestAccessLevel ?? 0)) return level
    }
    return highestAccessLevel
  }, null)
}

export function getGroupAccessLevel(project: Project, user: UserObject, config: Config): number | null {
  if (project.owner.id === user.id) return AccessLevel.OWNER
  return getGroupAccessLevelFromProjectRole(project, user, config)
}

export async function ensureGroup(
  gitlabApi: GitlabProjectApi,
  project: Project,
  user: UserObject,
  config: Config,
) {
  const gitlabUser = await upsertUser({
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
  })

  const groupMembers = await gitlabApi.getGroupMembers()
  const existingMember = groupMembers.find(m => m.username === createUsername(user.email))
  const maxAccessLevel = getGroupAccessLevel(project, user, config)

  if (maxAccessLevel) {
    if (existingMember) {
      if (existingMember.access_level !== maxAccessLevel) {
        await gitlabApi.editGroupMember(gitlabUser.id, maxAccessLevel)
      }
    } else {
      await gitlabApi.addGroupMember(gitlabUser.id, maxAccessLevel)
    }
  } else {
    await gitlabApi.removeGroupMember(gitlabUser.id)
  }
}
