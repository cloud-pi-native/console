import { type StepCall, type Project, type ProjectLite, parseError, type UniqueRepo } from '@cpn-console/hooks'
import { deleteGroup } from './group.js'
import { createUsername, getUser } from './user.js'
import { ensureMembers } from './members.js'
import { ensureRepositories } from './repositories.js'

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
    // TODO déplacer les secrets dans un dossier pour tout lister plutôt que de sélectionner dans le code
    const gitlab = (await payload.apis.vault.read('GITLAB')).data
    return {
      status: {
        result: 'OK',
        message: 'secret retrieved',
      },
      secrets: {
        ...gitlab,
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

    await vaultApi.write({
      ORGANIZATION_NAME: project.organization.name,
      PROJECT_NAME: project.name,
      GIT_MIRROR_PROJECT_ID: mirrorTriggerToken.repoId,
      GIT_MIRROR_TOKEN: mirrorTriggerToken.token,
    }, 'GITLAB')

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
