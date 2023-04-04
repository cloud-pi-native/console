import { api } from './index.js'

export const createProject = async (userId, repo, group, groupId, externalRepoUrl) => {
  console.log({ repo, group })
  const searchResult = await api.Projects.search(repo)
  console.log({ searchResult })
  if (searchResult.length) {
    const existingProject = searchResult.find(project => project.path_with_namespace === group)
    if (existingProject) return existingProject
  }

  const test = await api.Projects.create({
    userId,
    name: repo,
    ci_config_path: '.gitlab-ci-dso.yml',
    namespace_id: groupId,
    import_url: externalRepoUrl,
    // mirror: true,
  })
  console.log({ test })
  return test
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
