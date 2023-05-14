import { gitlabToken } from '../../../utils/env.js'
import { createGroup, deleteGroup } from './group.js'
import { addGroupMember } from './permission.js'
import { createProject, createProjectMirror, deleteProject } from './project.js'
import { setProjectTrigger } from './triggers.js'
import { createUser, getUser } from './user.js'

// Check
export const checkApi = async (payload) => {
  const { owner } = payload.args
  const user = await getUser(owner.email)
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
export const createDsoProject = async (payload) => {
  try {
    const { project, organization, owner } = payload.args

    const group = await createGroup(project, organization)
    const user = await createUser(owner.email)
    const groupMember = await addGroupMember(group.id, user.id, 40)

    return {
      status: {
        result: 'OK',
        message: 'Created',
      },
      result: {
        group,
        user,
        groupMember,
      },
      vault: [{
        name: 'GITLAB',
        data: {
          ORGANIZATION_NAME: organization,
          PROJECT_NAME: project,
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

export const archiveDsoProject = async (payload) => {
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
export const createDsoRepository = async (payload) => {
  try {
    const { internalRepoName, externalRepoUrl, organization, project, externalUserName, externalToken, isPrivate } = payload.args
    const externalRepoUrn = externalRepoUrl.split(/:\/\/(.*)/s)[1] // Un urN ne contient pas le protocole
    const internalMirrorRepoName = `${internalRepoName}-mirror`
    const projectCreated = await createProject({ internalRepoName, externalRepoUrn, group: project, organization, externalUserName, externalToken, isPrivate })
    const mirror = await createProjectMirror(internalMirrorRepoName, project, organization)
    const triggerToken = await setProjectTrigger(mirror.id)

    return {
      status: {
        result: 'OK',
        message: 'Created',
      },
      vault: [{
        name: `${internalMirrorRepoName}`,
        data: {
          ORGANIZATION_NAME: organization,
          PROJECT_NAME: project,
          GIT_INPUT_URL: externalRepoUrn,
          GIT_INPUT_USER: externalUserName,
          GIT_INPUT_PASSWORD: externalToken,
          GIT_OUTPUT_USER: triggerToken.owner.username,
          GIT_OUTPUT_PASSWORD: gitlabToken,
          GIT_OUTPUT_URL: projectCreated.http_url_to_repo.split(/:\/\/(.*)/s)[1],
          GIT_PIPELINE_TOKEN: triggerToken.token,
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

// export const updateDsoRepository = async (payload) => {
//   try {
//     // TODO #330
//     console.log('à implémenter')

//     return {
//       status: {
//         result: 'OK',
//         message: 'Updated',
//       },
//     }
//   } catch (error) {
//     return {
//       status: {
//         result: 'KO',
//         message: error.message,
//       },
//     }
//   }
// }

export const deleteDsoRepository = async (payload) => {
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
