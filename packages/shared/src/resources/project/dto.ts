import { ProjectModel } from './model'

export type CreateProjectDto = {
    body: {
      organizationId: ProjectModel['organizationId'],
      name: ProjectModel['name'],
      description: ProjectModel['description'],
  }
}

export type UpdateProjectDto = {
  params: {
    projectId: ProjectModel['id']
  }
  body: {
    organizationId: ProjectModel['organizationId'],
    name: ProjectModel['name'],
    description: ProjectModel['description'],
  }
}

export type ArchiveProjectDto = {
  params: {
    projectId: ProjectModel['id']
  }
}
