import { Inject, Injectable } from '@nestjs/common'
import { ProjectDatastoreService } from './project-datastore.service.js'

@Injectable()
export class ProjectService {
  constructor(
    @Inject(ProjectDatastoreService) private readonly deploymentDatastoreService: ProjectDatastoreService,
  ) {}

  async getProjectWithDetails(projectId: string) {
    const projectWithDetails = await this.deploymentDatastoreService.getProjectWithDetails(projectId)
    if (!projectWithDetails) throw new Error(`Project with id ${projectId} not found`)
    return projectWithDetails
  }
}
