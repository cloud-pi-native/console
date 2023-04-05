import { api } from './index.js'
import { getGroupId } from './group.js'

/**
 * @param {string} internalRepoName - nom du dépôt.
 * @param {string} externalRepoUrl - url du dépôt.
 * @param {string} group - nom du projet DSO.
 * @param {string} organization - nom de l'organisation DSO.
 */
export const createProject = async (internalRepoName, externalRepoUrl, group, organization) => {
  const groupId = await getGroupId(group, organization)
  const searchResults = await api.Projects.search(internalRepoName)
  if (searchResults.length) {
    const existingProject = searchResults.find(project => project.namespace.id === groupId)
    if (existingProject) return existingProject
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
export const deleteProject = async (internalRepoName, group, organization) => {
  const groupId = await getGroupId(group, organization)
  const searchResult = await api.Projects.search(internalRepoName)
  if (!searchResult.length) return
  const existingProject = searchResult
    .find(project => project.name === internalRepoName && project.namespace.id === groupId)
  if (!existingProject) return
  return api.Projects.remove(existingProject.id)
}
