import { okStatus, parseError, specificallyDisabled, specificallyEnabled } from '@cpn-console/hooks'
import type { AdminRole, ClusterObject, PluginResult, Project, ProjectLite, StepCall, UniqueRepo, ZoneObject, ProjectMember } from '@cpn-console/hooks'
import { AccessLevel } from '@gitbeaker/core'
import { deleteGroup } from './group.js'
import { createUsername, getUser, upsertUser } from './user.js'
import { ensureRepositories } from './repositories.js'
import type { VaultSecrets } from './utils.js'
import config from './config.js'
import type { GitlabProjectApi } from './class.js'
import { cleanGitlabError, matchRole } from './utils.js'
import {
  DEFAULT_ADMIN_GROUP_PATH,
  DEFAULT_AUDITOR_GROUP_PATH,
  DEFAULT_PROJECT_DEVELOPER_GROUP_PATH_SUFFIX,
  DEFAULT_PROJECT_MAINTAINER_GROUP_PATH_SUFFIX,
  DEFAULT_PROJECT_REPORTER_GROUP_PATH_SUFFIX,
} from './infos.js'

// Check
export const checkApi: StepCall<Project> = async (payload) => {
  try {
    const { users } = payload.args
    for (const user of users) {
      const userInfos = await getUser({ ...user, username: createUsername(user.email) })
      if (userInfos?.id === 1) {
        return {
          status: {
            result: 'KO',
            message: 'Gitlab notify: User 1 (root) should not use Console',
          },
        }
      }
    }

    return {
      status: {
        result: 'OK',
      },
    }
  } catch (error) {
    return {
      error: parseError(cleanGitlabError(error)),
      status: {
        result: 'KO',
        // @ts-ignore prévoir une fonction générique
        message: 'An unexpected error occured',
      },
    }
  }
}

export const getDsoProjectSecrets: StepCall<ProjectLite> = async (payload) => {
  try {
    if (!specificallyDisabled(payload.config.gitlab?.displayTriggerHint)) {
      // TODO déplacer les secrets dans un dossier pour tout lister plutôt que de sélectionner dans le code
      const gitlab = (await payload.apis.vault.read('GITLAB')).data as VaultSecrets['GITLAB']
      /* eslint-disable no-template-curly-in-string */
      const curlCommand = [
        'curl -X POST --fail',
        '-F token=\${GIT_MIRROR_TOKEN}',
        '-F ref=main',
        '-F variables[GIT_BRANCH_DEPLOY]=\${BRANCH_TO_SYNC}',
        '-F variables[PROJECT_NAME]=\${REPOSITORY_NAME}',
        `"${config().publicUrl}/api/v4/projects/${gitlab.GIT_MIRROR_PROJECT_ID}/trigger/pipeline"`,
      ]
      /* eslint-enable */
      const secrets: Record<string, string> = {
        GIT_MIRROR_PROJECT_ID: String(gitlab.GIT_MIRROR_PROJECT_ID),
        GIT_MIRROR_TOKEN: gitlab.GIT_MIRROR_TOKEN,
        'CURL COMMAND': curlCommand.join(' \\\n    '),
      }

      return {
        status: {
          result: 'OK',
          message: 'secret retrieved',
        },
        secrets,
      }
    }
    return {
      status: {
        result: 'OK',
        message: 'This feature is disabled',
      },
    }
  } catch (error) {
    return {
      error: parseError(cleanGitlabError(error)),
      status: {
        result: 'OK',
        message: 'No secrets found for this project',
      },
    }
  }
}

export const upsertDsoProject: StepCall<Project> = async (payload) => {
  const returnResult: PluginResult = {
    status: {
      result: 'OK',
    },
  }
  try {
    const project = payload.args
    const { gitlab: gitlabApi, vault: vaultApi } = payload.apis

    await gitlabApi.getOrCreateProjectGroup()

    const projectMirrorCreds = await gitlabApi.getProjectMirrorCreds(vaultApi)
    await ensureRepositories(gitlabApi, project, vaultApi, {
      botAccount: projectMirrorCreds.MIRROR_USER,
      token: projectMirrorCreds.MIRROR_TOKEN,
    })

    const destroySecrets = (await vaultApi.list())
      .filter(path => path.endsWith('-mirror'))
      .map(path => path.slice(1, path.length - 7))
      .filter(repoName => !project.repositories.find(projectRepo => projectRepo.internalRepoName === repoName))

    await Promise.all(destroySecrets
      .map(repoName => vaultApi.destroy(`${repoName}-mirror`)),
    )

    const mirrorTriggerToken = await gitlabApi.getMirrorProjectTriggerToken(vaultApi)

    const gitlabSecret: VaultSecrets['GITLAB'] = {
      PROJECT_SLUG: project.slug,
      GIT_MIRROR_PROJECT_ID: mirrorTriggerToken.repoId,
      GIT_MIRROR_TOKEN: mirrorTriggerToken.token,
    }

    await vaultApi.write(gitlabSecret, 'GITLAB')

    return returnResult
  } catch (error) {
    returnResult.error = parseError(cleanGitlabError(error))
    returnResult.status.result = 'KO'
    returnResult.status.message = 'Can\'t reconcile please inspect logs'
    return returnResult
  }
}

export const deleteDsoProject: StepCall<Project> = async (payload) => {
  try {
    const group = await payload.apis.gitlab.getProjectGroup()
    if (group) await deleteGroup(group.id, group.full_path)

    return {
      status: {
        result: 'OK',
        message: 'Deleted',
      },
    }
  } catch (error) {
    return {
      error: parseError(cleanGitlabError(error)),
      status: {
        result: 'KO',
        message: 'Failed',
      },
    }
  }
}

export const syncRepository: StepCall<UniqueRepo> = async (payload) => {
  const targetRepo = payload.args.repo
  const gitlabApi = payload.apis.gitlab
  try {
    await gitlabApi.triggerMirror(targetRepo.internalRepoName, targetRepo.syncAllBranches, targetRepo.branchName)
    return {
      status: {
        result: 'OK',
        message: 'Ci launched',
      },
    }
  } catch (error) {
    return {
      error: parseError(cleanGitlabError(error)),
      status: {
        result: 'KO',
        message: 'Failed to trigger sync',
      },
    }
  }
}

export const upsertZone: StepCall<ZoneObject> = async (payload) => {
  const returnResult: PluginResult = okStatus
  try {
    const gitlabApi = payload.apis.gitlab
    await gitlabApi.getOrCreateInfraProject(payload.args.slug)
    return returnResult
  } catch (error) {
    returnResult.error = parseError(cleanGitlabError(error))
    returnResult.status.result = 'KO'
    returnResult.status.message = 'Can\'t reconcile please inspect logs'
    return returnResult
  }
}

export const deleteZone: StepCall<ZoneObject> = async (payload) => {
  const returnResult: PluginResult = {
    status: {
      result: 'OK',
      message: 'Deleted',
    },
  }
  try {
    const gitlabApi = payload.apis.gitlab
    const zoneRepo = await gitlabApi.getOrCreateInfraProject(payload.args.slug)
    await gitlabApi.deleteRepository(zoneRepo.id, zoneRepo.path_with_namespace)
    return returnResult
  } catch (error) {
    returnResult.error = parseError(cleanGitlabError(error))
    returnResult.status.result = 'KO'
    returnResult.status.message = 'Can\'t reconcile please inspect logs'
    return returnResult
  }
}

export const commitFiles: StepCall<UniqueRepo | Project | ClusterObject | ZoneObject> = async (payload) => {
  const returnResult = payload.results.gitlab
  try {
    const filesUpdated = await payload.apis.gitlab.commitFiles()

    returnResult.status.message = `${filesUpdated} file${filesUpdated > 1 ? 's' : ''} updated`
    return returnResult
  } catch (error) {
    returnResult.error = parseError(cleanGitlabError(error))
    returnResult.status.result = 'KO'
    returnResult.status.message = 'Failed to commit files'
    return returnResult
  }
}

export const upsertAdminRole: StepCall<AdminRole> = async (payload) => {
  try {
    const role = payload.args
    const adminGroupPath = payload.config.gitlab?.adminGroupPath ?? DEFAULT_ADMIN_GROUP_PATH
    const auditorGroupPath = payload.config.gitlab?.auditorGroupPath ?? DEFAULT_AUDITOR_GROUP_PATH

    const isAdmin = role.oidcGroup === adminGroupPath ? true : undefined
    const isAuditor = role.oidcGroup === auditorGroupPath ? true : undefined

    if (isAdmin === undefined && isAuditor === undefined) {
      return {
        status: {
          result: 'OK',
          message: 'Not a managed role for GitLab plugin',
        },
      }
    }

    for (const member of role.members) {
      await upsertUser(member, isAdmin, isAuditor)
    }

    return {
      status: {
        result: 'OK',
        message: 'Members synced',
      },
    }
  } catch (error) {
    return {
      error: parseError(cleanGitlabError(error)),
      status: {
        result: 'KO',
        message: 'An error occured while syncing admin role',
      },
    }
  }
}

export const deleteAdminRole: StepCall<AdminRole> = async (payload) => {
  try {
    const role = payload.args
    const adminGroupPath = payload.config.gitlab?.adminGroupPath ?? DEFAULT_ADMIN_GROUP_PATH
    const auditorGroupPath = payload.config.gitlab?.auditorGroupPath ?? DEFAULT_AUDITOR_GROUP_PATH

    const isAdmin = role.oidcGroup === adminGroupPath ? false : undefined
    const isAuditor = role.oidcGroup === auditorGroupPath ? false : undefined

    if (isAdmin === undefined && isAuditor === undefined) {
      return {
        status: {
          result: 'OK',
          message: 'Not a managed role for GitLab plugin',
        },
      }
    }

    for (const member of role.members) {
      await upsertUser(member, isAdmin, isAuditor)
    }

    return {
      status: {
        result: 'OK',
        message: 'Admin role deleted and members synced',
      },
    }
  } catch (error) {
    return {
      error: parseError(cleanGitlabError(error)),
      status: {
        result: 'KO',
        message: 'An error occured while deleting admin role',
      },
    }
  }
}

export const upsertProjectMember: StepCall<ProjectMember> = async (payload) => {
  const member = payload.args
  const { gitlab: gitlabApi } = payload.apis as { gitlab: GitlabProjectApi } // TODO: apis is never type for some resaon
  const purge = payload.config.gitlab?.purge
  const projectReporterGroupPathSuffix = payload.config.gitlab?.projectReporterGroupPathSuffix ?? DEFAULT_PROJECT_REPORTER_GROUP_PATH_SUFFIX
  const projectDeveloperGroupPathSuffix = payload.config.gitlab?.projectDeveloperGroupPathSuffix ?? DEFAULT_PROJECT_DEVELOPER_GROUP_PATH_SUFFIX
  const projectMaintainerGroupPathSuffix = payload.config.gitlab?.projectMaintainerGroupPathSuffix ?? DEFAULT_PROJECT_MAINTAINER_GROUP_PATH_SUFFIX

  try {
    const gitlabUser = await upsertUser({
      id: member.userId,
      firstName: member.firstName,
      lastName: member.lastName,
      email: member.email,
    })

    let maxAccessLevel: number | undefined

    if (member.project.owner.id === member.userId) {
      maxAccessLevel = AccessLevel.OWNER
    } else if (member.roles.find(role => role.oidcGroup && matchRole(member.project.slug, role.oidcGroup, projectReporterGroupPathSuffix))) {
      maxAccessLevel = AccessLevel.GUEST
    } else if (member.roles.find(role => role.oidcGroup && matchRole(member.project.slug, role.oidcGroup, projectDeveloperGroupPathSuffix))) {
      maxAccessLevel = AccessLevel.DEVELOPER
    } else if (member.roles.find(role => role.oidcGroup && matchRole(member.project.slug, role.oidcGroup, projectMaintainerGroupPathSuffix))) {
      maxAccessLevel = AccessLevel.MAINTAINER
    }

    const groupMembers = await gitlabApi.getGroupMembers()
    const existingMember = groupMembers.find(m => m.id === gitlabUser.id)

    if (maxAccessLevel === undefined) {
      if (specificallyEnabled(purge)) {
        if (existingMember) {
          await gitlabApi.removeGroupMember(gitlabUser.id)
        }
        return {
          status: {
            result: 'OK',
            message: 'Member has no matching roles, removed from group',
          },
        }
      } else {
        console.warn(`Member ${gitlabUser.username} has no matching roles, not synced`)
      }
    }

    if (existingMember) {
      if (existingMember.access_level !== maxAccessLevel) {
        await gitlabApi.editGroupMember(gitlabUser.id, maxAccessLevel)
      }
    } else {
      await gitlabApi.addGroupMember(gitlabUser.id, maxAccessLevel)
    }

    return {
      status: {
        result: 'OK',
        message: 'Member synced',
      },
    }
  } catch (error) {
    return {
      error: parseError(cleanGitlabError(error)),
      status: {
        result: 'KO',
        message: 'An error happened while syncing project member',
      },
    }
  }
}

export const deleteProjectMember: StepCall<ProjectMember> = async (payload) => {
  const member = payload.args
  const { gitlab: gitlabApi } = payload.apis as { gitlab: GitlabProjectApi } // TODO: apis is never type for some resaon

  try {
    const userInfos = await getUser({ ...member, id: member.userId, username: createUsername(member.email) })
    if (!userInfos) {
      return {
        status: {
          result: 'OK',
          message: 'User not found in GitLab',
        },
      }
    }

    await gitlabApi.removeGroupMember(userInfos.id)

    return {
      status: {
        result: 'OK',
        message: 'Member deleted',
      },
    }
  } catch (error) {
    return {
      error: parseError(cleanGitlabError(error)),
      status: {
        result: 'KO',
        message: 'An error happened while deleting project member',
      },
    }
  }
}
