import { generateProjectKey } from '@cpn-console/hooks'
import { getAxiosInstance } from './tech'

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

export async function createDsoRepository(projectSlug: string, internalRepoName: string, sonarProjectKey?: string) {
  const sonarProjectName = `${projectSlug}-${internalRepoName}`
  if (!sonarProjectKey)
    sonarProjectKey = generateProjectKey(projectSlug, internalRepoName)
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
  projectSlug: string
  repository: string
  key: string
}

function filterProjectsOwning(repos: { key: string }[], projectSlug: string): SonarProjectResult[] {
  return repos.reduce((acc, repo) => {
    let isOrphan = true

    const sonarKey = repo.key
    const keyElements = sonarKey.split('-')
    keyElements.pop()
    for (let i = keyElements.length - 1; i > 0; i--) {
      const project = keyElements.slice(0, i).join('-')
      const repository = keyElements.slice(i).join('-')
      const keyComputed = generateProjectKey(project, repository)
      if (keyComputed === sonarKey) {
        if (project === projectSlug) {
          acc.push({
            projectSlug,
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

export async function findSonarProjectsForDsoProjects(projectSlug: string) {
  const axiosInstance = getAxiosInstance()
  let foundProjectKeys: SonarProjectResult[] = []

  let page = 0
  const pageSize = 100
  let total = 0
  do {
    page++
    const similarProjects = await axiosInstance.get('projects/search', {
      params: {
        q: projectSlug,
        p: page,
        ps: pageSize,
      },
    })
    total = similarProjects.data.paging.total
    foundProjectKeys = [...foundProjectKeys, ...filterProjectsOwning(similarProjects.data.components, projectSlug)]
  } while (page * pageSize < total)

  return foundProjectKeys
}

export const files = {
  'sonar-project.properties': (key: string) => `sonar.projectKey=${key}\nsonar.qualitygate.wait=true\n`,
}
