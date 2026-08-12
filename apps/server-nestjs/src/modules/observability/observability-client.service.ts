import type { ProjectSchema } from '@gitbeaker/core'
import type { CondensedProjectSchemaWith } from '../gitlab/gitlab-client.service'
import type { ObservabilityData, ObservabilityProject } from './observability.utils'
import { Inject, Injectable, Logger } from '@nestjs/common'
import { parse, stringify } from 'yaml'
import { GitlabClientService } from '../gitlab/gitlab-client.service'
import { StartActiveSpan } from '../infrastructure/telemetry/telemetry.decorator'
import {
  OBSERVABILITY_GROUP_NAME,
  OBSERVABILITY_REPO_NAME,
  OBSERVABILITY_VALUES_BRANCH,
  OBSERVABILITY_VALUES_PATH,
} from './observability.constants'
import { observabilityDataSchema, observabilityYamlInitData } from './observability.utils'

@Injectable()
export class ObservabilityClientService {
  private readonly logger = new Logger(ObservabilityClientService.name)

  constructor(
    @Inject(GitlabClientService) private readonly gitlab: GitlabClientService,
  ) {
  }

  @StartActiveSpan()
  async getOrCreateValuesRepo(): Promise<ProjectSchema> {
    this.logger.verbose(`Ensuring observability GitLab group ${OBSERVABILITY_GROUP_NAME}`)
    const group = await this.gitlab.getOrCreateGroupByPath(OBSERVABILITY_GROUP_NAME)

    for await (const repo of this.gitlab.getGroupRepos(group.id)) {
      if (repo.name === OBSERVABILITY_REPO_NAME) {
        this.logger.verbose(`Found observability values repository (repoId=${repo.id})`)
        return repo
      }
    }

    this.logger.log(`Creating GitLab observability values repository ${OBSERVABILITY_REPO_NAME}`)
    return this.gitlab.createGroupRepo(group.id, OBSERVABILITY_REPO_NAME)
  }

  async getValuesFile(repo: CondensedProjectSchemaWith<'id'>): Promise<ObservabilityData> {
    const file = await this.gitlab.getFile(repo, OBSERVABILITY_VALUES_PATH, OBSERVABILITY_VALUES_BRANCH)
    if (!file) {
      this.logger.verbose('Observability values file not found, using init data')
      return structuredClone(observabilityYamlInitData)
    }
    const content = Buffer.from(file.content, 'base64').toString('utf-8')
    return observabilityDataSchema.parse(parse(content))
  }

  async commitValuesFile(
    repo: CondensedProjectSchemaWith<'id'>,
    data: ObservabilityData,
    commitMessage: string,
  ): Promise<void> {
    const yamlString = stringify(data, {
      sortMapEntries: false,
      lineWidth: -1,
    })
    const action = await this.gitlab.generateCreateOrUpdateAction(
      repo,
      { ref: OBSERVABILITY_VALUES_BRANCH, filePath: OBSERVABILITY_VALUES_PATH, content: yamlString },
    )
    if (action) {
      await this.gitlab.maybeCreateCommit(
        repo,
        { message: commitMessage, actions: [action], ref: OBSERVABILITY_VALUES_BRANCH },
      )
    }
  }

  @StartActiveSpan()
  async updateProjectConfig(
    repo: CondensedProjectSchemaWith<'id'>,
    project: { id: string, slug: string },
    projectValue: ObservabilityProject,
  ): Promise<void> {
    const yamlFile = await this.getValuesFile(repo)
    const projects = yamlFile.global?.projects ?? {}

    if (JSON.stringify(projects[project.id]) === JSON.stringify(projectValue)) {
      this.logger.verbose(`Observability values already up-to-date for project ${project.slug}`)
      return
    }

    projects[project.id] = projectValue
    yamlFile.global = {
      ...yamlFile.global,
      projects,
    }

    await this.commitValuesFile(repo, yamlFile, `Update project ${project.slug}`)
  }

  @StartActiveSpan()
  async deleteProjectConfig(
    repo: CondensedProjectSchemaWith<'id'>,
    project: { id: string, slug: string, name: string },
  ): Promise<void> {
    const yamlFile = await this.getValuesFile(repo)

    if (!yamlFile.global?.projects || !(project.id in yamlFile.global.projects)) {
      this.logger.verbose(`No observability values to delete for project ${project.slug}`)
      return
    }

    delete yamlFile.global.projects[project.id]
    await this.commitValuesFile(repo, yamlFile, `Delete project ${project.name}`)
  }
}
