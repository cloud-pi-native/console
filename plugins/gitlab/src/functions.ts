import { type StepCall, type Project, type ProjectLite, parseError, type UniqueRepo, specificallyDisabled } from '@cpn-console/hooks'
import { deleteGroup } from './group.js'
import { createUsername, getUser } from './user.js'
import { ensureMembers } from './members.js'
import { ensureRepositories } from './repositories.js'
import { VaultSecrets, getConfig } from './utils.js'

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
      error: parseError(error),
      status: {
        result: 'KO',
        // @ts-ignore prévoir une fonction générique
        message: error.message,
      },
    }
  }
}

export const getDsoProjectSecrets: StepCall<ProjectLite> = async (payload) => {
  try {
    if (!specificallyDisabled(payload.config.gitlab?.displayTriggerHint)) {
      // TODO déplacer les secrets dans un dossier pour tout lister plutôt que de sélectionner dans le code
      const gitlab = (await payload.apis.vault.read('GITLAB')).data as VaultSecrets['GITLAB']
      const curlCommand = [
        'curl -X POST --fail',
        // eslint-disable-next-line no-useless-escape, no-template-curly-in-string
        '-F token=\${GIT_MIRROR_TOKEN}',
        '-F ref=main',
        // eslint-disable-next-line no-useless-escape, no-template-curly-in-string
        '-F variables[GIT_BRANCH_DEPLOY]=\${BRANCH_TO_SYNC}',
        // eslint-disable-next-line no-useless-escape, no-template-curly-in-string
        '-F variables[PROJECT_NAME]=\${REPOSITORY_NAME}',
        `"${getConfig().url}/api/v4/projects/${gitlab.GIT_MIRROR_PROJECT_ID}/trigger/pipeline"`,
      ]
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
      error: parseError(error),
      status: {
        result: 'OK',
        message: 'No secrets found for this project',
      },
    }
  }
}

export const upsertDsoProject: StepCall<Project> = async (payload) => {
  try {
    const project = payload.args
    const { gitlab: gitlabApi, vault: vaultApi } = payload.apis

    await gitlabApi.getOrCreateProjectGroup()
    await gitlabApi.getOrCreateInfraGroup()

    await ensureMembers(gitlabApi, project)

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
      ORGANIZATION_NAME: project.organization.name,
      PROJECT_NAME: project.name,
      GIT_MIRROR_PROJECT_ID: mirrorTriggerToken.repoId,
      GIT_MIRROR_TOKEN: mirrorTriggerToken.token,
    }

    await vaultApi.write(gitlabSecret, 'GITLAB')

    return {
      status: {
        result: 'OK',
      },
    }
  } catch (error) {
    return {
      error: parseError(error),
      status: {
        result: 'KO',
        message: 'Can\'t reconcile please inspect logs',
      },
    }
  }
}

export const deleteDsoProject: StepCall<Project> = async (payload) => {
  try {
    const group = await payload.apis.gitlab.getProjectGroup()
    if (group) await deleteGroup(group?.id)

    return {
      status: {
        result: 'OK',
        message: 'Deleted',
      },
    }
  } catch (error) {
    return {
      error: parseError(error),
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
    await gitlabApi.triggerMirror(targetRepo.internalRepoName, targetRepo.branchName)
    return {
      status: {
        result: 'OK',
        message: 'Ci launched',
      },
    }
  } catch (error) {
    return {
      error: parseError(error),
      status: {
        result: 'KO',
        message: 'Failed to trigger sync',
      },
    }
  }
}

export const commitFiles: StepCall<UniqueRepo | Project> = async (payload) => {
  try {
    const filesUpdated = await payload.apis.gitlab.commitFiles()
    return {
      status: {
        result: 'OK',
        message: `${filesUpdated} file${filesUpdated > 1 ? 's' : ''} updated`,
      },
    }
  } catch (error) {
    return {
      error: parseError(error),
      status: {
        result: 'KO',
        message: 'Failed to commit files',
      },
    }
  }
}
