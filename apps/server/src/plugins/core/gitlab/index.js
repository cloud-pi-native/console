import { Gitlab } from '@gitbeaker/node'
import { gitlabToken, gitlabUrl, projectPath } from '../../../utils/env.js'
import { createGroup, deleteGroup } from './group.js'
import { addGroupMember } from './permission.js'
import { createProject, deleteProject } from './project.js'
import { setProjectTrigger } from './triggers.js'
import { createUser } from './user.js'

export const api = new Gitlab({ token: gitlabToken, host: gitlabUrl })

let groupRootId

export const getGroupRootId = async () => {
  if (groupRootId) return groupRootId
  const groupRootSearch = await api.Groups.search(projectPath.join('/'))
  groupRootId = (groupRootSearch.find(grp => grp.full_path === projectPath.join('/'))).id
  if (!groupRootId) throw Error(`Gitlab not ready, group ${projectPath} not found`)
  return groupRootId
}

// Project
export const createDsoProject = async (payload) => {
  try {
    const { project, organization, email } = payload.args

    const group = await createGroup(project, organization)
    const user = await createUser(email)
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
        message: error.message,
      },
    }
  }
}

// Repo
export const createDsoRepository = async (payload) => {
  try {
    const { internalRepoName, externalRepoUrl, organization, project } = payload.args
    const projectCreated = await createProject(internalRepoName, externalRepoUrl, project, organization)
    const mirror = await createProject(`${internalRepoName}-mirror`, externalRepoUrl, project, organization)
    await setProjectTrigger(mirror.id)

    return {
      status: {
        result: 'OK',
        message: 'Created',
      },
      result: {
        project: projectCreated,
        mirror,
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
    }
  }
}

export const updateDsoRepository = async (payload) => {
  try {
    // TODO #330
    console.log(payload)

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
        message: error.message,
      },
    }
  }
}

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
        message: error.message,
      },
    }
  }
}
