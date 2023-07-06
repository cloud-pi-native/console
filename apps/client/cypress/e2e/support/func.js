import { oldData } from 'test-utils'

export const getModel = (model) => oldData[model]
export const getModelById = (model, id) => model === 'projects'
  ? getProjectById(id)
  : oldData[model].find(key => key.id === id)

export const getProjects = () => getModel('projects')
  .map(project => ({
    ...project,
    organization: getModel('organizations')
      .find(organization => organization.id === project.organizationId),
    repositories: getModel('repositorys')
      .filter(repository => repository.projectId === project.id),
    environments: getModel('environments')
      .filter(environment => environment.projectId === project.id)
      .map(environment => ({
        ...environment,
        permissions: getModel('permissions').filter(permission => permission.environmentId === environment.id),
      })),
    users: getModel('roles')
      .filter(role => role.projectId === project.id)
      .map(role => ({
        role: role.role,
        ...getModelById('users', role.userId),
      })),
  }))

export const getProjectById = (id) => getProjects().find(project => project.id === id)

export const getUserProjects = (userId) => getProjects()
  .filter(project => project.status !== 'archived' && project.users.find(user => user.id === userId))
