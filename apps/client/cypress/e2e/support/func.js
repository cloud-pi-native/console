import { data } from 'test-utils'

export const getModel = (model) => data[model]
export const getModelById = (model, id) => model === 'project'
  ? getProjectById(id)
  : data[model].find(key => key.id === id)

export const getProjects = () => getModel('project')
  .map(project => ({
    ...project,
    organization: getModel('organization')
      .find(organization => organization.id === project.organizationId),
    repositories: getModel('repository')
      .filter(repository => repository.projectId === project.id),
    environments: getModel('environment')
      .filter(environment => environment.projectId === project.id)
      .map(environment => ({
        ...environment,
        permissions: getModel('permission').filter(permission => permission.environmentId === environment.id),
      })),
    users: getModel('role')
      .filter(role => role.projectId === project.id)
      .map(role => ({
        role: role.role,
        ...getModelById('user', role.userId),
      })),
  }))

export const getProjectById = (id) => getProjects().find(project => project.id === id)

export const getUserProjects = (userId) => getProjects()
  .filter(project => project.status !== 'archived' && project.users.find(user => user.id === userId))
