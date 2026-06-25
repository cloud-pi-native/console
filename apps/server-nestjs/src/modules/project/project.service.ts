import { Inject, Injectable } from '@nestjs/common'
import { ProjectDatastoreService } from './project-datastore.service'

@Injectable()
export class ProjectService {
  constructor(
    @Inject(ProjectDatastoreService) private readonly datastoreService: ProjectDatastoreService,
  ) {}

  async get(projectId: string) {
    const projectWithDetails = await this.datastoreService.getProjectWithDetails(projectId)
    if (!projectWithDetails) throw new Error(`Project with id ${projectId} not found`)
    return projectWithDetails
  }
}
