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

export const deleteProject = async (repo, group) => {
  console.log({ repo, group })
  const searchResult = await api.Groups.search(repo)
  console.log({ searchResult })
  if (searchResult.length) {
    const existingProject = searchResult.find(project => project.path_with_namespace === group)
    if (existingProject) return existingProject
  }
  return api.Projects.remove(searchResult.id)
}
