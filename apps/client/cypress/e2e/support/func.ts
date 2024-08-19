import { data } from '@cpn-console/test-utils'

export const getModel = model => data[model]

export const getModelById = (model: string, id: string) => model === 'project'
  ? getProjectById(id)
  : data[model]?.find(key => key.id === id)

export const getProjects = () => getModel('project')
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

export const getProjectById = (id: string) => getProjects()?.find(project => project.id === id)

export const getUserProjects = (userId: string) => getProjects()
  ?.filter(project => project.status !== 'archived' && project.users?.find(user => user.id === userId))
