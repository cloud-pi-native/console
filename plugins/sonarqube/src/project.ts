import { generateProjectKey } from '@cpn-console/hooks'
import { getAxiosInstance } from './tech.js'

export interface SonarPaging {
  pageIndex: number
  pageSize: number
  total: number
}

export type Qualifiers =
  'BRC' | // - Sub - projects
  'DIR' | // - Directories
  'FIL' | // - Files
  'TRK' | // - Projects
  'UTS' // - Test Files

export interface SonarProject {
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

export async function createDsoRepository(organizationName: string, projectName: string, internalRepoName: string, sonarProjectKey?: string) {
  const sonarProjectName = `${organizationName}-${projectName}-${internalRepoName}`
  if (!sonarProjectKey)
    sonarProjectKey = generateProjectKey(organizationName, projectName, internalRepoName)
  return createProject(sonarProjectKey, sonarProjectName)
}

export async function ensureRepositoryConfiguration(projectKey: string, login: string, groupName: string) {
  const axiosInstance = getAxiosInstance()

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
}

export async function createProject(projectKey: string, projectName: string) {
  return getAxiosInstance()({
    url: 'projects/create',
    method: 'post',
    params: {
      project: projectKey,
      visibility: 'private',
      name: projectName,
      mainbranch: 'main',
    },
  })
}

export async function deleteDsoRepository(projectKey: string) {
  const axiosInstance = getAxiosInstance()

  await axiosInstance({
    url: 'projects/delete',
    method: 'post',
    params: {
      project: projectKey,
    },
  })
}

interface SonarProjectResult {
  organization: string
  project: string
  repository: string
  key: string
}

function filterProjectsOwning(repos: { key: string }[], organizationName: string, projectName: string): SonarProjectResult[] {
  return repos.reduce((acc, repo) => {
    let isOrphan = true

    const sonarKey = repo.key as string
    const keyElements = sonarKey.split('-')
    const organization = keyElements.shift() as string
    keyElements.pop()
    for (let i = keyElements.length - 1; i > 0; i--) {
      const project = keyElements.slice(0, i).join('-')
      const repository = keyElements.slice(i).join('-')
      const keyComputed = generateProjectKey(organization, project, repository)
      if (keyComputed === sonarKey) {
        if (project === projectName && organization === organizationName) {
          acc.push({
            organization,
            project,
            repository,
            key: sonarKey,
          })
        }
        isOrphan = false
      }
    }
    if (isOrphan) {
      console.warn('/!\\ Orphan Project:', sonarKey)
    }
    return acc
  }, [] as SonarProjectResult[])
}

export async function findSonarProjectsForDsoProjects(organizationName: string, projectName: string) {
  const axiosInstance = getAxiosInstance()
  let foundProjectKeys: SonarProjectResult[] = []
  const baseSearch = `${organizationName}-${projectName}`

  let page = 0
  const pageSize = 100
  let total = 0
  do {
    page++
    const similarProjects = await axiosInstance.get('projects/search', {
      params: {
        q: baseSearch,
        p: page,
        ps: pageSize,
      },
    })
    total = similarProjects.data.paging.total
    foundProjectKeys = [...foundProjectKeys, ...filterProjectsOwning(similarProjects.data.components, organizationName, projectName)]
  } while (page * pageSize < total)

  return foundProjectKeys
}

export const files = {
  'sonar-project.properties': (key: string) => `sonar.projectKey=${key}\nsonar.qualitygate.wait=true\n`,
}
