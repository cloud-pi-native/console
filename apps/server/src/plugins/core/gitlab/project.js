import { api } from './index.js'
import { getGroupId } from './group.js'

export const createProject = async (userId, internalRepoName, externalRepoUrl, group, organization) => {
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
