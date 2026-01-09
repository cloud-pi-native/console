import type { GroupSchema } from '@gitbeaker/rest'
import type { ProjectSchema } from '@gitbeaker/core'
import { getGroupRootId } from './utils.js'
import { GitlabApi } from './gitlab-api.js'

const infraGroupName = 'Infra'
const infraGroupPath = 'infra'

/** Class providing zone-specific functions to interact with Gitlab API */
export class GitlabZoneApi extends GitlabApi {
  private infraProjectsByZoneSlug: Map<string, ProjectSchema>

  constructor() {
    super()
    this.infraProjectsByZoneSlug = new Map()
  }

  // Group Infra
  public async getOrCreateInfraGroup(): Promise<GroupSchema> {
    const rootId = await getGroupRootId()
    // Get or create projects_root_dir/infra group
    const searchResult = await this.api.Groups.search(infraGroupName)
    const existingParentGroup = searchResult.find(group => group.parent_id === rootId && group.name === infraGroupName)
    return existingParentGroup || await this.api.Groups.create(infraGroupName, infraGroupPath, {
      parentId: rootId,
      projectCreationLevel: 'maintainer',
      subgroupCreationLevel: 'owner',
      defaultBranchProtection: 0,
      description: 'Group that hosts infrastructure-as-code repositories for all zones (ArgoCD pull targets).',
    })
  }

  public async getOrCreateInfraProject(zone: string): Promise<ProjectSchema> {
    if (this.infraProjectsByZoneSlug.has(zone)) {
      return this.infraProjectsByZoneSlug.get(zone)!
    }
    const infraGroup = await this.getOrCreateInfraGroup()
    // Get or create projects_root_dir/infra/zone
    const infraProjects = await this.api.Groups.allProjects(infraGroup.id, {
      search: zone,
      simple: true,
      perPage: 100,
    })
    const project: ProjectSchema = infraProjects.find(repo => repo.name === zone) ?? await this.createEmptyRepository({
      repoName: zone,
      groupId: infraGroup.id,
      description: 'Repository hosting deployment files for this zone.',
      createFirstCommit: true,
    },
    )
    this.infraProjectsByZoneSlug.set(zone, project)
    return project
  }
}
