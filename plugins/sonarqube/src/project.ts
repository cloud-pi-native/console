import { type CreateRepositoryExecArgs, type DeleteRepositoryExecArgs, type Organization, type Project, type RepositoryCreate, type StepCall, generateProjectKey, parseError } from '@cpn-console/hooks'
import { getAxiosInstance } from './tech.js'

export type SonarPaging = {
  pageIndex: number,
  pageSize: number,
  total: number
}

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
  const axiosInstance = getAxiosInstance()
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
      error: parseError(error),
      status: {
        result: 'KO',
        message: 'Failed to create Sonarqube Project',
      },
    }
  }
}

const createProject = async (projectKey: string, projectName: string) => {
  const axiosInstance = getAxiosInstance()
  const sonarProjectSearch: { paging: SonarPaging, components: SonarProject[] } = (await axiosInstance({
    url: 'projects/search',
    method: 'get',
    params: {
      projects: projectKey,
    },
  }))?.data

  if (!sonarProjectSearch.paging.total) { // Project missing
    const sonarProjectCreate = (await axiosInstance({
      url: 'projects/create',
      method: 'post',
      params: {
        project: projectKey,
        visibility: 'private',
        name: projectName,
        mainbranch: 'main',
      },
    }))?.data
    let ensureExist = false
    while (!ensureExist) {
      const sonarProjectSearch: { paging: SonarPaging, components: SonarProject[] } = (await axiosInstance({
        url: 'projects/search',
        method: 'get',
        params: {
          projects: projectKey,
        },
      }))?.data
      if (sonarProjectSearch.paging.total) ensureExist = true
    }
    return {
      sonarProject: sonarProjectCreate.project,
      message: 'Project created',
    }
  } else {
    return {
      sonarProject: sonarProjectSearch.components[0],
      message: 'Project already exists',
    }
  }
}

export const deleteDsoRepository: StepCall<DeleteRepositoryExecArgs> = async (payload) => {
  const axiosInstance = getAxiosInstance()
  try {
    const { organization, project, internalRepoName } = payload.args
    const projectKey = generateProjectKey(organization, project, internalRepoName)
    const sonarProjectSearch: { paging: SonarPaging, components: SonarProject[] } = (await axiosInstance({
      url: 'projects/search',
      method: 'get',
      params: {
        project: projectKey,
      },
    }))?.data

    let message: string

    if (sonarProjectSearch.components.length) { // Project exists
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
      error: parseError(error),
      status: {
        result: 'OK',
        message: 'Failed to delete Sonarqube Project',
      },
    }
  }
}

export const generateProjectName = (org: Organization, proj: Project, repo: RepositoryCreate['internalRepoName']) => {
  return `${org}-${proj}-${repo}`
}
