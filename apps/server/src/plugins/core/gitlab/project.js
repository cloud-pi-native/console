import { api } from './index.js'

export const createProject = async (userId, repo, group, groupId, externalRepoUrl) => {
  const searchResults = await api.Projects.search(repo)
  if (searchResults.length) {
    const existingProject = searchResults.find(project => project.path_with_namespace === group)
    if (existingProject) return existingProject
  }
  // TODO : 400 bad request
  //   description: {
  //   path: [ 'repo-1 is a reserved name' ],
  //   namespace: [ "can't be blank" ]
  // }
  console.log({ userId, repo, group, groupId, externalRepoUrl })
  try {
    const test = await api.Projects.create({
      user_id: userId,
      name: repo,
      ci_config_path: '.gitlab-ci-dso.yml',
      namespace_id: groupId,
      import_url: externalRepoUrl,
      // mirror: true,
    })
    console.log(test)
    return test
  } catch (error) {
    console.log(error)
    return error
  }
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
