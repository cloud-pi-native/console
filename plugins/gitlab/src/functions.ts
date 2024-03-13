import type { StepCall, AddUserToProjectExecArgs, ArchiveProjectExecArgs, CreateProjectExecArgs, CreateProjectValidateArgs, CreateRepositoryExecArgs, DeleteRepositoryExecArgs, ProjectBase, UpdateRepositoryExecArgs } from '@cpn-console/hooks'
import { generateProjectKey } from '@cpn-console/hooks'
import { createGroup, deleteGroup, getGroupId, setGroupVariable, setProjectVariable } from './group.js'
import { addGroupMember, getGroupMembers, removeGroupMember } from './permission.js'
import { createGroupToken, createProject, createProjectMirror, deleteProject } from './project.js'
import { setProjectTrigger } from './triggers.js'
import { createUser, createUsername, getUser } from './user.js'
import { getConfig } from './utils.js'
import { AccessLevel } from '@gitbeaker/core'

// Check
export const checkApi: StepCall<CreateProjectValidateArgs> = async (payload) => {
  try {
    const { owner } = payload.args
    const user = await getUser({ ...owner, username: createUsername(owner.email) })

    if (user?.id === 1) {
      return {
        status: {
          result: 'KO',
          message: 'Gitlab notify: User 1 (root) should not use Console',
        },
      }
    }
    return {
      status: {
        result: 'OK',
      },
    }
  } catch (error) {
    return {
      status: {
        result: 'KO',
        // @ts-ignore prévoir une fonction générique
        message: error.message,
      },
      error: JSON.stringify(error),
    }
  }
}

// Project
export const createDsoProject: StepCall<CreateProjectExecArgs> = async (payload) => {
  try {
    const { project, organization, owner } = payload.args
    const group = await createGroup(project, organization)
    const user = await createUser(owner)
    const groupMember = await addGroupMember(group.id, user.id, AccessLevel.DEVELOPER)
    const internalMirrorRepoName = 'mirror'
    const mirror = await createProjectMirror(internalMirrorRepoName, project, organization)
    const triggerToken = await setProjectTrigger(mirror.id)
    const botMirrorToken = await createGroupToken(group.id, `${organization}-${project}-bot`)
    // Sonar vars saving in CI
    const sonarSecret = await payload.apis.vault.read('SONAR')

    const sonarVariable = await setGroupVariable(group.id, {
      key: 'SONAR_TOKEN',
      masked: true,
      protected: false,
      value: sonarSecret.data.SONAR_TOKEN,
      variable_type: 'env_var',
    })

    await payload.apis.vault.write({
      ORGANIZATION_NAME: organization,
      PROJECT_NAME: project,
      GIT_MIRROR_PROJECT_ID: mirror.id,
      GIT_MIRROR_TOKEN: triggerToken.token,
    }, 'GITLAB')
    await payload.apis.vault.write({
      MIRROR_USER: botMirrorToken.name,
      MIRROR_TOKEN: botMirrorToken.token,
    }, 'tech/GITLAB_MIRROR')

    return {
      status: {
        result: 'OK',
        message: 'Created',
      },
      result: {
        group,
        user,
        groupMember,
        mirror,
        sonarVariable,
      },
    }
  } catch (error) {
    return {
      status: {
        result: 'KO',
        // @ts-ignore prévoir une fonction générique
        message: error.message,
      },
      error: JSON.stringify(error),
    }
  }
}

export const archiveDsoProject: StepCall<ArchiveProjectExecArgs> = async (payload) => {
  try {
    const { project, organization } = payload.args

    await deleteGroup(project, organization)

    return {
      status: {
        result: 'OK',
        message: 'Deleted',
      },
    }
  } catch (error) {
    return {
      status: {
        result: 'KO',
        message: 'Failed',
      },
      error: JSON.stringify(error),
    }
  }
}

// Repo
export const createDsoRepository: StepCall<CreateRepositoryExecArgs> = async (payload) => {
  try {
    const { internalRepoName, externalRepoUrl, organization, project, externalUserName, externalToken, isPrivate } = payload.args
    const externalRepoUrn = externalRepoUrl.split(/:\/\/(.*)/s)[1] // Un urN ne contient pas le protocole
    const internalMirrorRepoName = `${internalRepoName}-mirror`
    const groupId = await getGroupId(project, organization)
    if (!groupId) throw Error('Impossible de retrouver le namespace')
    const projectCreated = await createProject({ groupId, internalRepoName, externalRepoUrn, externalUserName, externalToken, isPrivate })
    // TODO let sonarqube store this variable through an API
    const projectKey = generateProjectKey(organization, project, internalRepoName)
    await setProjectVariable(projectCreated.id, {
      key: 'PROJECT_KEY',
      masked: false,
      protected: false,
      value: projectKey,
      variable_type: 'env_var',
      environment_scope: '*',
    })

    const mirrorSecretData = {
      GIT_INPUT_URL: externalRepoUrn,
      GIT_INPUT_USER: externalUserName,
      GIT_INPUT_PASSWORD: externalToken,
      GIT_OUTPUT_URL: projectCreated.http_url_to_repo.split(/:\/\/(.*)/s)[1],
      GIT_OUTPUT_USER: '',
      GIT_OUTPUT_PASSWORD: '',
    }
    try {
      const gitlabSecret = await payload.apis.vault.read('tech/GITLAB_MIRROR')
      mirrorSecretData.GIT_OUTPUT_USER = gitlabSecret.data.MIRROR_USER
      mirrorSecretData.GIT_OUTPUT_PASSWORD = gitlabSecret.data.MIRROR_TOKEN
    } catch (error) {
      mirrorSecretData.GIT_OUTPUT_USER = 'root'
      mirrorSecretData.GIT_OUTPUT_PASSWORD = getConfig().token
    }
    await payload.apis.vault.write(mirrorSecretData, internalMirrorRepoName)

    return {
      status: {
        result: 'OK',
        message: 'Created',
      },
    }
  } catch (error) {
    return {
      status: {
        result: 'KO',
        // @ts-ignore prévoir une fonction générique
        message: error.message,
      },
      error: JSON.stringify(error),
    }
  }
}

export const updateDsoRepository: StepCall<UpdateRepositoryExecArgs> = async (payload) => {
  const { internalRepoName, externalToken, externalRepoUrl, externalUserName } = payload.args
  try {
    const vaultData = (await payload.apis.vault.read(`${internalRepoName}-mirror`)).data

    vaultData.GIT_INPUT_PASSWORD = externalToken
    vaultData.GIT_INPUT_USER = externalUserName
    vaultData.GIT_INPUT_URL = externalRepoUrl?.split(/:\/\/(.*)/s)[1] // Un urN ne contient pas le protocole

    await payload.apis.vault.write(vaultData, `${internalRepoName}-mirror`)

    return {
      status: {
        result: 'OK',
        message: 'Updated',
      },
    }
  } catch (error) {
    return {
      status: {
        result: 'KO',
        message: 'Failed',
      },
      error: JSON.stringify(error),
    }
  }
}

export const deleteDsoRepository: StepCall<DeleteRepositoryExecArgs> = async (payload) => {
  try {
    const { internalRepoName, organization, project } = payload.args
    await deleteProject(internalRepoName, project, organization)
    await deleteProject(`${internalRepoName}-mirror`, project, organization)
    const internalMirrorRepoName = `${internalRepoName}-mirror`
    await payload.apis.vault.destroy(internalMirrorRepoName)

    return {
      status: {
        result: 'OK',
        message: 'Deleted',
      },
    }
  } catch (error) {
    return {
      status: {
        result: 'KO',
        message: 'Failed',
      },
      error: JSON.stringify(error),
    }
  }
}

// Members
export const addDsoGroupMember: StepCall<AddUserToProjectExecArgs> = async (payload) => {
  try {
    const { organization, project, user } = payload.args
    const groupId = await getGroupId(project, organization)
    if (!groupId) throw Error('Impossible de retrouver le namespace')
    const member = await createUser(user)
    const groupMembers = await getGroupMembers(groupId)
    let groupMember = groupMembers.find(groupMember => groupMember.id === member.id)
    if (!groupMember) {
      groupMember = await addGroupMember(groupId, member.id)
    }

    return {
      status: {
        result: 'OK',
        message: 'Created',
      },
      result: {
        groupId,
        groupMember,
      },
    }
  } catch (error) {
    return {
      status: {
        result: 'KO',
        message: 'Failed',
      },
      error: JSON.stringify(error),
    }
  }
}

export const removeDsoGroupMember: StepCall<AddUserToProjectExecArgs> = async (payload) => {
  try {
    const { organization, project, user } = payload.args
    const groupId = await getGroupId(project, organization)
    if (!groupId) throw Error('Impossible de retrouver le namespace')
    const member = await createUser(user)
    const groupMembers = await getGroupMembers(groupId)
    const groupMember = groupMembers.find(groupMember => groupMember.id === member.id)
    if (groupMember) {
      await removeGroupMember(groupId, groupMember.id)
    }

    return {
      status: {
        result: 'OK',
        message: 'Deleted',
      },
      result: {
        groupId,
      },
    }
  } catch (error) {
    return {
      status: {
        result: 'KO',
        message: 'Failed',
      },
      error: JSON.stringify(error),
    }
  }
}

export const getDsoProjectSecrets: StepCall<ProjectBase> = async (payload) => {
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
      status: {
        result: 'OK',
        message: 'No secrets found for this project',
      },
      error: JSON.stringify(error),
    }
  }
}
