import type { UserObject, Config, Project } from '@cpn-console/hooks'
import { AccessLevel } from '@gitbeaker/core'
import { matchRole } from './utils.js'
import {
  DEFAULT_PROJECT_DEVELOPER_GROUP_PATH_SUFFIX,
  DEFAULT_PROJECT_MAINTAINER_GROUP_PATH_SUFFIX,
  DEFAULT_PROJECT_REPORTER_GROUP_PATH_SUFFIX,
} from './infos.js'
import type { GitlabProjectApi } from './class.js'
import { createUsername, upsertUser } from './user.js'

export function getGroupAccessLevelFromProjectRole(project: Project, user: UserObject, config: Config) {
  const projectReporterGroupPathSuffixes = (config.gitlab?.projectReporterGroupPathSuffix ?? DEFAULT_PROJECT_REPORTER_GROUP_PATH_SUFFIX).split(',')
  const projectDeveloperGroupPathSuffixes = (config.gitlab?.projectDeveloperGroupPathSuffix ?? DEFAULT_PROJECT_DEVELOPER_GROUP_PATH_SUFFIX).split(',')
  const projectMaintainerGroupPathSuffixes = (config.gitlab?.projectMaintainerGroupPathSuffix ?? DEFAULT_PROJECT_MAINTAINER_GROUP_PATH_SUFFIX).split(',')

  return project.roles.reduce<number | null>((accessLevel, role) => {
    if (role.users.some(userRole => userRole.id === user.id)) {
      if (role.oidcGroup && matchRole(project.slug, role.oidcGroup, projectReporterGroupPathSuffixes)) {
        return AccessLevel.REPORTER
      } else if (role.oidcGroup && matchRole(project.slug, role.oidcGroup, projectDeveloperGroupPathSuffixes)) {
        return AccessLevel.DEVELOPER
      } else if (role.oidcGroup && matchRole(project.slug, role.oidcGroup, projectMaintainerGroupPathSuffixes)) {
        return AccessLevel.MAINTAINER
      }
    }
    return accessLevel
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
