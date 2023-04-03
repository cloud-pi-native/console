import { api } from './index.js'

export const createProject = async (repo, group, groupId, externalRepoUrl) => {
  const searchResult = await api.Projects.search(repo)
  console.log({ searchResult })
  if (searchResult.length) {
    const existingProject = searchResult.find(project => project.path_with_namespace === group)
    if (existingProject) return existingProject
  }
  console.log({ repo, group })

  const test = await api.Projects.create({
    name: repo,
    ci_config_path: '.gitlab-ci-dso.yml',
    namespace_id: groupId,
    import_url: externalRepoUrl,
    // mirror: true,
  })
  console.log({ test })
  return test
}

// export const deleteGroup = async (groupName, organization) => {
//   const searchResult = await api.Groups.search(groupName)
//   const parentId = await getOrganizationId(organization)
//   const existingGroup = searchResult.find(group => group.parent_id === parentId)
//   if (!existingGroup) {
//     return
//   }
//   return api.Groups.remove(existingGroup.id)
// }
