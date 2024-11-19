import type { AxiosInstance } from 'axios'
import type { WritePolicy } from './utils.js'
import { deleteIfExists } from './utils.js'
import getConfig from './config.js'

function getRepoNames(projectName: string) { // Unique function per language cause names are unique per repo
  return {
    hosted: [
      {
        repo: `${projectName}-npm`,
        privilege: `${projectName}-npm-privilege`,
      },
    ],
    group: {
      repo: `${projectName}-npm-group`,
      privilege: `${projectName}-npm-group-privilege`,
    },
  }
}
export async function createNpmRepo(axiosInstance: AxiosInstance, projectName: string, writePolicy: WritePolicy) {
  const names = getRepoNames(projectName)
  // create local repo maven
  for (const repVersion of names.hosted) {
    const repo = await axiosInstance({
      method: 'GET',
      url: `/repositories/npm/hosted/${repVersion.repo}`,
      validateStatus: code => [200, 404].includes(code),
    })
    if (repo.status === 404) {
      await axiosInstance({
        method: 'post',
        url: '/repositories/npm/hosted',
        data: {
          name: repVersion.repo,
          online: true,
          storage: {
            blobStoreName: 'default',
            strictContentTypeValidation: true,
            writePolicy,
          },
          cleanup: { policyNames: ['string'] },
          component: { proprietaryComponents: true },
        },
        validateStatus: code => [201].includes(code),
      })
    } else {
      await axiosInstance({
        method: 'put',
        url: `/repositories/npm/hosted/${repVersion.repo}`,
        data: {
          name: repVersion.repo,
          online: true,
          storage: {
            blobStoreName: 'default',
            strictContentTypeValidation: true,
            writePolicy,
          },
          cleanup: { policyNames: ['string'] },
          component: { proprietaryComponents: true },
        },
        validateStatus: code => [204].includes(code),
      })
    }
  }
  // create maven group
  const group = await axiosInstance({
    method: 'get',
    url: `/repositories/npm/group/${names.group.repo}`,
    validateStatus: code => [200, 404].includes(code),
  })
  if (group.status === 404) {
    await axiosInstance({
      method: 'post',
      url: '/repositories/npm/group',
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
          ],
        },
      },
      validateStatus: code => [201].includes(code),
    })
  } else {
    await axiosInstance({
      url: `/repositories/npm/group/${names.group.repo}`,
      method: 'put',
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
          ],
        },
      },
      validateStatus: code => [204].includes(code),
    })
  }

  for (const name of [...names.hosted, names.group]) {
    const privilege = await axiosInstance({
      method: 'get',
      url: `/security/privileges/${name.privilege}`,
      validateStatus: code => [200, 404].includes(code),
    })
    if (privilege.status === 404) {
      await axiosInstance({
        method: 'post',
        url: '/security/privileges/repository-view',
        data: {
          name: name.privilege,
          description: `Privilege for organization ${projectName} for repo ${name.repo}`,
          actions: ['all'],
          format: 'npm',
          repository: name.repo,
        },
        validateStatus: code => [201].includes(code),
      })
    } else {
      await axiosInstance({
        method: 'put',
        url: `/security/privileges/repository-view/${name.privilege}`,
        data: {
          name: name.privilege,
          description: `Privilege for organization ${projectName} for repo ${name.repo}`,
          actions: ['all'],
          format: 'npm',
          repository: name.repo,
        },
        validateStatus: code => [204].includes(code),
      })
    }
  }
  return names
}

export function deleteNpmRepo(axiosInstance: AxiosInstance, projectName: string) {
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

export function getNpmUrls(projectName: string) {
  const nexusUrl = getConfig().secretExposedUrl
  const names = getRepoNames(projectName)
  return {
    NPM_REPO: `${nexusUrl}/${names.hosted[0].repo}`,
  }
}
