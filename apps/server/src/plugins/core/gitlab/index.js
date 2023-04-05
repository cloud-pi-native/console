import { Gitlab } from '@gitbeaker/node'
import { gitlabToken, gitlabUrl, projectPath } from '../../../utils/env.js'
import { createGroup, deleteGroup } from './group.js'
import { addGroupMember } from './permission.js'
import { createProject, deleteProject } from './project.js'
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
    const { name, organization, email } = payload.args

    const group = await createGroup(name, organization)
    const user = await createUser(email)
    const groupMember = await addGroupMember(group.id, user.id)

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
          PROJECT_NAME: name,
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

export const archiveDsoProject = async (payload) => {
  try {
    const { name, organization } = payload.args

    await deleteGroup(name, organization)

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
        message: error.message,
      },
    }
  }
}

// Repo
// https://github.com/dnum-mi/dso-playbooks/blob/main/roles/gitlab-project-checkout/tasks/main.yml
export const createDsoRepository = async (payload) => {
  try {
    const { internalRepoName, externalRepoUrl, organization, projectName } = payload.args
    const project = await createProject(internalRepoName, externalRepoUrl, projectName, organization)
    const mirror = await createProject(`${internalRepoName}-mirror`, externalRepoUrl, projectName, organization)
    // await setProjectTriggers()

    return {
      status: {
        result: 'OK',
        message: 'Created',
      },
      result: {
        project,
        mirror,
      },
      vault: [{
        name: 'GITLAB',
        data: {
          ORGANIZATION_NAME: organization,
          PROJECT_NAME: projectName,
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

// https://github.com/dnum-mi/dso-playbooks/blob/main/roles/gitlab-project-delete/tasks/main.yml
export const deleteDsoRepository = async (payload) => {
  try {
    const { internalRepoName, organization, projectName } = payload.args
    await deleteProject(internalRepoName, projectName, organization)
    await deleteProject(`${internalRepoName}-mirror`, projectName, organization)

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
        message: error.message,
      },
    }
  }
}
