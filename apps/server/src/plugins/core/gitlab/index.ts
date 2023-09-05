import type { HookPayload, StepCall } from '@/plugins/hooks/hook.js'
import { gitlabToken } from '@/utils/env.js'
import { createGroup, deleteGroup, getGroupId, setGroupVariable, setProjectVariable } from './group.js'
import { addGroupMember, getGroupMembers, removeGroupMember } from './permission.js'
import { createProject, createProjectMirror, deleteProject } from './project.js'
import { setProjectTrigger } from './triggers.js'
import { createUser, createUsername, getUser } from './user.js'
import type { ArchiveProjectExecArgs, CreateProjectExecArgs } from '@/plugins/hooks/project.js'
import type { CreateRepositoryExecArgs, DeleteRepositoryExecArgs } from '@/plugins/hooks/repository.js'
import { User } from '@prisma/client'
import { AddUserToProjectExecArgs } from '@/plugins/hooks/team.js'

// Check
export const checkApi = async (payload: HookPayload<{ owner: User }>) => {
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
}

// Project
export const createDsoProject: StepCall<CreateProjectExecArgs> = async (payload) => {
  try {
    const { project, organization, owner } = payload.args
    const { SONAR_TOKEN } = payload.sonarqube.vault.find(secret => secret.name === 'SONAR').data
    const group = await createGroup(project, organization)
    const user = await createUser(owner)
    const groupMember = await addGroupMember(group.id, user.id, 40)
    const internalMirrorRepoName = 'mirror'
    const mirror = await createProjectMirror(internalMirrorRepoName, project, organization)
    // TODO #566 : display in front
    const triggerToken = await setProjectTrigger(mirror.id)

    // Sonar vars saving in CI
    const sonarVariable = await setGroupVariable(group.id, {
      key: 'SONAR_TOKEN',
      masked: true,
      protected: false,
      value: SONAR_TOKEN,
      variable_type: 'env_var',
    })

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
      vault: [{
        name: 'GITLAB',
        data: {
          ORGANIZATION_NAME: organization,
          PROJECT_NAME: project,
          GIT_MIRROR_PROJECT_ID: mirror.id,
          GIT_MIRROR_TOKEN: triggerToken.token,
        },
      }],
    }
  } catch (error) {
    return {
      status: {
        result: 'KO',
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
    const projectKey = `${organization}-${project}-${internalRepoName}`
    await setProjectVariable(projectCreated.id, {
      key: 'PROJECT_KEY',
      masked: false,
      protected: false,
      value: projectKey,
      variable_type: 'env_var',
      environment_scope: '*',
    })
    return {
      status: {
        result: 'OK',
        message: 'Created',
      },
      vault: [{
        name: `${internalMirrorRepoName}`,
        data: {
          GIT_INPUT_URL: externalRepoUrn,
          GIT_INPUT_USER: externalUserName,
          GIT_INPUT_PASSWORD: externalToken,
          GIT_OUTPUT_USER: 'root',
          GIT_OUTPUT_PASSWORD: gitlabToken,
          GIT_OUTPUT_URL: projectCreated.http_url_to_repo.split(/:\/\/(.*)/s)[1],
        },
      }],
    }
  } catch (error) {
    return {
      status: {
        result: 'KO',
        message: error.message,
      },
      error: JSON.stringify(error),
    }
  }
}

export const deleteDsoRepository: StepCall<DeleteRepositoryExecArgs> = async (payload) => {
  try {
    const { internalRepoName, organization, project } = payload.args
    await deleteProject(internalRepoName, project, organization)
    deleteProject(`${internalRepoName}-mirror`, project, organization)

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
