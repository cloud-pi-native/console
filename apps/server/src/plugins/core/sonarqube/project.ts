import { CreateRepositoryExecArgs, DeleteRepositoryExecArgs, Organization, Project, RepositoryCreate } from '@/plugins/hooks/index.js'
import { StepCall } from '@/plugins/hooks/hook.js'
import { axiosInstance } from './index.js'
import { createHmac } from 'crypto'

export type Qualifiers =
  'BRC' | // - Sub - projects
  'DIR' | // - Directories
  'FIL' | // - Files
  'TRK' | // - Projects
  'UTS' // - Test Files

export type SonarProject = {
  key: string // unique key name
  name: string
  qualifier: Qualifiers
  visibility: 'private' | 'public'
  lastAnalysisDate?: string
  revision?: string
}
type SearchProjectRes = {
  data: {
    paging: {
      total: number
    },
    components: SonarProject[]
  }
}

const robotPermissions = [
  'user',
  'codeviewer',
  'admin',
  'scan',
]
const groupPermissions = [
  'user',
  'codeviewer',
  'issueadmin',
  'securityhotspotadmin',
  'scan',
]

export const createDsoRepository: StepCall<CreateRepositoryExecArgs> = async (payload) => {
  try {
    const { organization, project, internalRepoName } = payload.args
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const projectName = generateProjectName(organization, project, internalRepoName)
    const projectKey = generateProjectKey(organization, project, internalRepoName)
    const login = `${organization}-${project}` // robot account
    const groupName = `/${organization}-${project}` // oidc group
    const { message, sonarProject } = await createProject(projectKey, projectName)

    for (const permission of robotPermissions) {
      await axiosInstance({
        url: 'permissions/add_user',
        method: 'post',
        params: {
          projectKey,
          permission,
          login,
        },
      })
    }
    for (const permission of groupPermissions) {
      await axiosInstance({
        url: 'permissions/add_group',
        method: 'post',
        params: {
          projectKey,
          permission,
          groupName,
        },
      })
    }
    return {
      status: {
        result: 'OK',
        message,
      },
      sonarProject,
    }
  } catch (error) {
    return {
      status: {
        result: 'KO',
        message: 'Failed to create Sonarqube Project',
      },
      error: JSON.stringify(error),
    }
  }
}

export const renewDsoRepositoryTokens: StepCall<CreateRepositoryExecArgs> = async (payload) => {
  try {
    const { organization, project, internalRepoName } = payload.args
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const projectName = generateProjectName(organization, project, internalRepoName)
    const projectKey = generateProjectKey(organization, project, internalRepoName)
    const login = `${organization}-${project}` // robot account
    const groupName = `/${organization}-${project}` // oidc group
    const { message, sonarProject } = await createProject(projectKey, projectName)

    for (const permission of robotPermissions) {
      await axiosInstance({
        url: 'permissions/add_user',
        method: 'post',
        params: {
          projectKey,
          permission,
          login,
        },
      })
    }
    for (const permission of groupPermissions) {
      await axiosInstance({
        url: 'permissions/add_group',
        method: 'post',
        params: {
          projectKey,
          permission,
          groupName,
        },
      })
    }
    return {
      status: {
        result: 'OK',
        message,
      },
      sonarProject,
    }
  } catch (error) {
    return {
      status: {
        result: 'KO',
        message: 'Failed to create Sonarqube Project',
      },
      error: JSON.stringify(error),
    }
  }
}

const createProject = async (projectKey: string, projectName: string) => {
  const sonarProjectSearch = await axiosInstance({
    url: 'projects/search',
    method: 'get',
    params: {
      projects: projectKey,
    },
  }) as SearchProjectRes

  if (!sonarProjectSearch.data.paging.total) { // Project missing
    const sonarProjectCreate = await axiosInstance({
      url: 'projects/create',
      method: 'post',
      params: {
        project: projectKey,
        visibility: 'private',
        name: projectName,
        mainbranch: 'main',
      },
    })
    let ensureExist = false
    while (!ensureExist) {
      const sonarProjectSearch = await axiosInstance({
        url: 'projects/search',
        method: 'get',
        params: {
          projects: projectKey,
        },
      }) as SearchProjectRes
      if (sonarProjectSearch.data.paging.total) ensureExist = true
    }
    return {
      sonarProject: sonarProjectCreate.data.project,
      message: 'Project created',
    }
  } else {
    return {
      sonarProject: sonarProjectSearch.data.components[0],
      message: 'Project already exists',
    }
  }
}

export const deleteDsoRepository: StepCall<DeleteRepositoryExecArgs> = async (payload) => {
  try {
    const { organization, project, internalRepoName } = payload.args
    const projectKey = generateProjectKey(organization, project, internalRepoName)
    const sonarProjectSearch = await axiosInstance({
      url: 'projects/search',
      method: 'get',
      params: {
        project: projectKey,
      },
    }) as SearchProjectRes

    let message: string

    if (sonarProjectSearch.data.components.length) { // Project exists
      await axiosInstance({
        url: 'projects/delete',
        method: 'post',
        params: {
          project: projectKey,
        },
      })
      message = 'Project deleted'
    } else {
      message = 'Project already missing'
    }
    return {
      status: {
        result: 'OK',
        message,
      },
    }
  } catch (error) {
    return {
      status: {
        result: 'OK',
        message: 'Failed to delete Sonarqube Project',
      },
      error: JSON.stringify(error),
    }
  }
}

export const generateProjectName = (org: Organization, proj: Project, repo: RepositoryCreate['internalRepoName']) => {
  return `${org}-${proj}-${repo}`
}

export const generateProjectKey = (org: Organization, proj: Project, repo: RepositoryCreate['internalRepoName']) => {
  const repoHash = createHmac('sha256', '')
    .update(repo)
    .digest('hex')
    .slice(0, 4)
  return `${org}-${proj}-${repo}-${repoHash}`
}
