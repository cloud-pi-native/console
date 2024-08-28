import { data } from '@cpn-console/test-utils'

export const getModel = model => data[model]
export const getProjectById = (id: string) => getProjects()?.find(project => project.id === id)

export function getModelById(model: string, id: string) {
  return model === 'project'
    ? getProjectById(id)
    : data[model]?.find(key => key.id === id)
}

export function getProjects() {
  return getModel('project')
    ?.map(project => ({
      ...project,
      organization: getModel('organization')
        ?.find(organization => organization.id === project.organizationId),
      repositories: getModel('repository')
        ?.filter(repository => repository.projectId === project.id),
      environments: getModel('environment')
        ?.filter(environment => environment.projectId === project.id)
        ?.map(environment => ({
          ...environment,
          permissions: getModel('permission')?.filter(permission => permission.environmentId === environment.id),
        })),
      members: getModel('projectMembers')
        ?.filter(member => member.projectId === project.id)
        ?.map(member => ({
          roleIds: member.roleIds,
          ...getModelById('user', member.userId),
        })),
    }))
}

export function getProjectMembers(userId: string) {
  return getProjects()
    ?.filter(project => project.status !== 'archived' && project.members?.find(member => member.id === userId))
}
