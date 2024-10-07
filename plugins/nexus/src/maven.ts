import type { AxiosInstance } from 'axios'
import { deleteIfExists } from './utils.js'
import { getConfig } from './functions.js'

// Retro-compatibilty, maven is a special case with bad name formats
function getRepoNames(projectName: string) { // Unique function per language cause names are unique per repo
  return {
    hosted: [
      {
        repo: `${projectName}-repository-release`,
        privilege: `${projectName}-privilege-release`,
      },
      {
        repo: `${projectName}-repository-snapshot`,
        privilege: `${projectName}-privilege-snapshot`,
      },
    ],
    group: {
      repo: `${projectName}-repository-group`,
      privilege: `${projectName}-privilege-group`,
    },
  }
}

export async function createMavenRepo(axiosInstance: AxiosInstance, projectName: string) {
  const names = getRepoNames(projectName)

  // create local repo maven
  for (const repVersion of names.hosted) {
    await axiosInstance({
      method: 'post',
      url: '/repositories/maven/hosted',
      data: {
        name: repVersion.repo,
        online: true,
        storage: {
          blobStoreName: 'default',
          strictContentTypeValidation: true,
          writePolicy: 'allow_once',
        },
        cleanup: { policyNames: ['string'] },
        component: { proprietaryComponents: true },
        maven: {
          versionPolicy: 'MIXED',
          layoutPolicy: 'STRICT',
          contentDisposition: 'ATTACHMENT',
        },
      },
      validateStatus: code => [201, 400].includes(code),
    })
  }

  // create maven group
  await axiosInstance({
    method: 'post',
    url: '/repositories/maven/group',
    data: {
      name: names.group.repo,
      online: true,
      storage: {
        blobStoreName: 'default',
        strictContentTypeValidation: true,
      },
      group: {
        memberNames: [
          ...names.hosted.map(({ repo }) => repo),
          'maven-public',
        ],
      },
    },
    validateStatus: code => [201, 400].includes(code),
  })

  // create privileges
  for (const name of [...names.hosted, names.group]) {
    await axiosInstance({
      method: 'post',
      url: '/security/privileges/repository-view',
      data: {
        name: name.privilege,
        description: `Privilege for organization ${projectName} for repo ${name.repo}`,
        actions: ['all'],
        format: 'maven2',
        repository: name.repo,
      },
      validateStatus: code => [201, 400].includes(code),
    })
  }
  return names
}

export function deleteMavenRepo(axiosInstance: AxiosInstance, projectName: string) {
  const names = getRepoNames(projectName)
  const repoPaths = [names.group, ...names.hosted]
  const privileges = [...names.hosted, names.group]
  const pathsToDelete = [
    // delete privileges
    ...privileges.map(({ privilege }) => `/security/privileges/${privilege}`),
    // delete local repo maven snapshot
    ...repoPaths.map(repo => `/repositories/${repo.repo}`),
  ]
  return pathsToDelete.map(path => deleteIfExists(path, axiosInstance))
}

export function getMavenUrls(projectName: string) {
  const nexusUrl = getConfig().url
  const names = getRepoNames(projectName)
  return {
    MAVEN_REPO_RELEASE: `${nexusUrl}/${names.hosted[0].repo}`,
    MAVEN_REPO_SNAPSHOT: `${nexusUrl}/${names.hosted[1].repo}`,
  }
}
