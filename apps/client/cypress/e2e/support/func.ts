import type { ProjectV2 } from '@cpn-console/shared'
import { data } from '@cpn-console/test-utils'

export const getModel = (model: keyof typeof data) => data[model]
export const getProjectById = (id: string) => getProjects().find((project: ProjectV2) => project.id === id)

export function getModelById(model: string, id: string) {
  return model === 'project'
    ? getProjectById(id)
    : data[model]?.find(key => key.id === id)
}

export function getProjects(): ProjectV2[] {
  return getModel('project')
    .map(project => ({
      ...project,
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
    })) satisfies ProjectV2[]
}

export function getProjectMembers(userId: string) {
  return getProjects()
    ?.filter(project => project.status !== 'archived' && project.members?.find(member => member.id === userId))
}
