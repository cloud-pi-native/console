import type { AdminRole, ClusterObject, PluginResult, Project, ProjectLite, ProjectMember, StepCall, UniqueRepo, ZoneObject } from '@cpn-console/hooks'
import type { GitlabProjectApi } from './class.js'
import type { VaultSecrets } from './utils.js'
import { okStatus, specificallyDisabled } from '@cpn-console/hooks'
import config from './config.js'
import { deleteGroup } from './group.js'
import {
  DEFAULT_ADMIN_GROUP_PATH,
  DEFAULT_AUDITOR_GROUP_PATH,
} from './infos.js'
import { ensureGroup } from './members.js'
import { ensureRepositories } from './repositories.js'
import { createUsername, getUser, upsertUser } from './user.js'
import { cleanGitlabError } from './utils.js'

// Check
export const checkApi: StepCall<Project> = async (payload) => {
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
}

export const getDsoProjectSecrets: StepCall<ProjectLite> = async (payload) => {
  if (!specificallyDisabled(payload.config.gitlab?.displayTriggerHint)) {
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
}

export const upsertDsoProject: StepCall<Project> = async (payload) => {
  const returnResult: PluginResult = {
    status: {
      result: 'OK',
    },
  }
  const project = payload.args
  const { gitlab: gitlabApi, vault: vaultApi } = payload.apis

  await gitlabApi.getOrCreateProjectGroup()

  await Promise.all(project.users.map(user =>
    ensureGroup(gitlabApi, project, user, payload.config),
  ))

  const projectMirrorCreds = await gitlabApi.getProjectMirrorCreds(vaultApi)
  await ensureRepositories(gitlabApi, project, vaultApi, {
    botAccount: projectMirrorCreds.MIRROR_USER,
    token: projectMirrorCreds.MIRROR_TOKEN,
  })

  const destroySecrets = (await vaultApi.list())
    .filter(path => path.endsWith('-mirror'))
    .map(path => path.slice(1, path.length - 7))
    .filter(repoName => !project.repositories.some(projectRepo => projectRepo.internalRepoName === repoName))

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
}

export const deleteDsoProject: StepCall<Project> = async (payload) => {
  const group = await payload.apis.gitlab.getProjectGroup()
  if (group) await deleteGroup(group.id, group.full_path)

  return {
    status: {
      result: 'OK',
      message: 'Deleted',
    },
  }
}

export const syncRepository: StepCall<UniqueRepo> = async (payload) => {
  const targetRepo = payload.args.repo
  const gitlabApi = payload.apis.gitlab
  await gitlabApi.triggerMirror(targetRepo.internalRepoName, targetRepo.syncAllBranches, targetRepo.branchName)
  return {
    status: {
      result: 'OK',
      message: 'Ci launched',
    },
  }
}

export const upsertZone: StepCall<ZoneObject> = async (payload) => {
  const returnResult: PluginResult = okStatus
  const gitlabApi = payload.apis.gitlab
  await gitlabApi.getOrCreateInfraProject(payload.args.slug)
  return returnResult
}

export const deleteZone: StepCall<ZoneObject> = async (payload) => {
  const returnResult: PluginResult = {
    status: {
      result: 'OK',
      message: 'Deleted',
    },
  }
  const gitlabApi = payload.apis.gitlab
  const zoneRepo = await gitlabApi.getOrCreateInfraProject(payload.args.slug)
  await gitlabApi.deleteRepository(zoneRepo.id, zoneRepo.path_with_namespace)
  return returnResult
}

export const commitFiles: StepCall<UniqueRepo | Project | ClusterObject | ZoneObject> = async (payload) => {
  const returnResult = payload.results.gitlab
  const filesUpdated = await payload.apis.gitlab.commitFiles()

  returnResult.status.message = `${filesUpdated} file${filesUpdated > 1 ? 's' : ''} updated`
  return returnResult
}

export const upsertAdminRole: StepCall<AdminRole> = async (payload) => {
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
}

export const deleteAdminRole: StepCall<AdminRole> = async (payload) => {
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
}

export const upsertProjectMember: StepCall<ProjectMember> = async (payload) => {
  const member = payload.args
  const { gitlab: gitlabApi } = payload.apis as { gitlab: GitlabProjectApi } // TODO: apis is never type for some resaon

  await Promise.all(member.project.users.map(user =>
    ensureGroup(gitlabApi, member.project, user, payload.config),
  ))

  return {
    status: {
      result: 'OK',
      message: 'Member synced',
    },
  }
}

export const deleteProjectMember: StepCall<ProjectMember> = async (payload) => {
  const member = payload.args
  const { gitlab: gitlabApi } = payload.apis as { gitlab: GitlabProjectApi } // TODO: apis is never type for some resaon

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
}
