import * as fs from 'node:fs/promises'
import path from 'node:path'
import { api } from './utils.js'
import { getGroupId } from './group.js'

/**
 * @param {string} internalRepoName - nom du dépôt.
 * @param {string} externalRepoUrl - url du dépôt.
 * @param {string} group - nom du projet DSO.
 * @param {string} organization - nom de l'organisation DSO.
 */
export const createProject = async (internalRepoName, externalRepoUrl, group, organization, externalUserName, externalToken) => {
  const groupId = await getGroupId(group, organization)
  if (!groupId) throw Error('Impossible de retrouver le namespace')
  const searchResults = await api.Projects.search(internalRepoName)
  if (searchResults.length) {
    const existingProject = searchResults.find(project => project.namespace.id === groupId)
    if (existingProject) return existingProject
  }
  if (externalUserName && externalToken) {
    externalRepoUrl = `https://${externalUserName}:${externalToken}@${externalRepoUrl.split('://')[1]}`
  }
  return await api.Projects.create(
    {
      name: internalRepoName,
      namespace_id: groupId,
      ci_config_path: '.gitlab-ci-dso.yml',
      import_url: externalRepoUrl,
    },
  )
}

/**
 * @param {string} internalRepoName - nom du dépôt.
 * @param {string} group - nom du projet DSO.
 * @param {string} organization - nom de l'organisation DSO.
 */
export const createProjectMirror = async (internalRepoName, group, organization) => {
  const groupId = await getGroupId(group, organization)
  if (!groupId) throw Error('Impossible de retrouver le namespace')
  const searchResults = await api.Projects.search(internalRepoName)
  if (searchResults.length) {
    const existingProject = searchResults.find(project => project.namespace.id === groupId)
    if (existingProject) return existingProject
  }
  const project = await api.Projects.create(
    {
      name: internalRepoName,
      namespace_id: groupId,
    },
  )
  api.Commits.create(project.id, 'main', 'ci: :construction_worker: first mirror', mirrorFirstActions)
  return project
}

/**
 * @param {string} internalRepoName - nom du dépôt.
 * @param {string} group - nom du projet DSO.
 * @param {string} organization - nom de l'organisation DSO.
 */
export const deleteProject = async (internalRepoName, group, organization) => {
  const groupId = await getGroupId(group, organization)
  const searchResult = await api.Projects.search(internalRepoName)
  if (!searchResult.length) return
  const existingProject = searchResult
    .find(project => project.name === internalRepoName && project.namespace.id === groupId)
  if (!existingProject) return
  return api.Projects.remove(existingProject.id)
}

const gitlabCiYml = (await fs.readFile(path.resolve('src/plugins/core/gitlab/files/.gitlab-ci.yml'))).toString()
const mirrorSh = (await fs.readFile(path.resolve('src/plugins/core/gitlab/files/mirror.sh'))).toString()

const mirrorFirstActions = [
  {
    action: 'create',
    filePath: '.gitlab-ci.yml',
    content: gitlabCiYml,
    execute_filemode: false,
  },
  {
    action: 'create',
    filePath: 'mirror.sh',
    content: mirrorSh,
    execute_filemode: true,
  },
]
