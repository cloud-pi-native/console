import { okStatus, parseError, specificallyDisabled } from '@cpn-console/hooks'
import type { ClusterObject, PluginResult, Project, ProjectLite, StepCall, UniqueRepo, ZoneObject } from '@cpn-console/hooks'
import { insert } from '@cpn-console/shared'
import { deleteGroup } from './group.js'
import { createUsername, getUser } from './user.js'
import { ensureMembers } from './members.js'
import { ensureRepositories } from './repositories.js'
import type { VaultSecrets } from './utils.js'
import { cleanGitlabError } from './utils.js'
import config from './config.js'

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
    await gitlabApi.ensureRightsGroups()

    const { failedInUpsertUsers } = await ensureMembers(gitlabApi, project)
    if (failedInUpsertUsers) {
      returnResult.status.result = 'WARNING'
      returnResult.warnReasons = insert(returnResult.warnReasons, 'Failed to create or upsert users in Gitlab')
    }

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
