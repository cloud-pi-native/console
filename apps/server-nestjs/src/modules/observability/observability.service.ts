import type GroupRepresentation from '@keycloak/keycloak-admin-client/lib/defs/groupRepresentation'
import type { ConfigType } from '@nestjs/config'
import type { CondensedProjectSchemaWith } from '../gitlab/gitlab-client.service'
import type { RequiredPluginResult } from '../plugin/plugin.utils'
import type { ProjectWithDetails } from './observability-datastore.service'
import type { GrafanaSubGroupName, ListPerms } from './observability.utils'
import { Inject, Injectable, Logger } from '@nestjs/common'
import { OnEvent } from '@nestjs/event-emitter'
import { trace } from '@opentelemetry/api'
import { observabilityConfigFactory } from '../../config/observability.config'
import { getErrorResponseStatus } from '../../utils/http.utils'
import { GitlabClientService } from '../gitlab/gitlab-client.service'
import { StartActiveSpan } from '../infrastructure/telemetry/telemetry.decorator'
import { KeycloakClientService } from '../keycloak/keycloak-client.service'
import { capturePluginResult } from '../plugin/plugin.utils'
import { ObservabilityClientService } from './observability-client.service'
import { ObservabilityDatastoreService } from './observability-datastore.service'
import {
  GRAFANA_GROUP_NAME,
  OBSERVABILITY_CHART_FILE,
  OBSERVABILITY_REPOSITORY,
  OBSERVABILITY_TEMPLATE_FILE,
} from './observability.constants'
import {
  generateGrafanaHprodRbacGroupPaths,
  generateGrafanaProdRbacGroupPaths,
  generateKeycloakRootGroupPath,
  generateObservabilityProject,
  getListPerms,
  grafanaRbacMembershipMappings,
  grafanaRbacSubGroupNames,
  isPluginDisabled,
  observabilityChartContent,
  observabilityTemplateContent,
} from './observability.utils'

@Injectable()
export class ObservabilityService {
  private readonly logger = new Logger(ObservabilityService.name)

  constructor(
    @Inject(ObservabilityDatastoreService) private readonly datastore: ObservabilityDatastoreService,
    @Inject(ObservabilityClientService) private readonly client: ObservabilityClientService,
    @Inject(GitlabClientService) private readonly gitlab: GitlabClientService,
    @Inject(KeycloakClientService) private readonly keycloak: KeycloakClientService,
    @Inject(observabilityConfigFactory.KEY) private readonly config: ConfigType<typeof observabilityConfigFactory>,
  ) {
    this.logger.log('ObservabilityService initialized')
  }

  @OnEvent('project.upsert')
  async handleUpsert(project: ProjectWithDetails): Promise<RequiredPluginResult<'observability'>> {
    return capturePluginResult('observability', () => this.syncProject(project))
  }

  @StartActiveSpan()
  private async syncProject(project: ProjectWithDetails) {
    const span = trace.getActiveSpan()
    span?.setAttribute('project.slug', project.slug)
    this.logger.log(`Handling a project upsert event for ${project.slug}`)

    if (isPluginDisabled(project)) {
      this.logger.log(`Observability plugin disabled for project ${project.slug}`)
      return
    }

    await this.ensureProjectRepository(project)
    await this.syncObservabilityConfig(project)
    await this.syncKeycloakGroups(project)

    this.logger.log(`Observability sync completed for project ${project.slug}`)
  }

  @OnEvent('project.delete')
  async handleDelete(project: ProjectWithDetails): Promise<RequiredPluginResult<'observability'>> {
    return capturePluginResult('observability', () => this.cleanupProject(project))
  }

  @StartActiveSpan()
  private async cleanupProject(project: ProjectWithDetails) {
    const span = trace.getActiveSpan()
    span?.setAttribute('project.slug', project.slug)
    this.logger.log(`Handling a project delete event for ${project.slug}`)

    if (isPluginDisabled(project)) {
      this.logger.log(`Observability plugin disabled for project ${project.slug}, skipping cleanup`)
      return
    }

    await Promise.all([
      this.deleteKeycloakGroups(project),
      this.deleteProjectConfig(project),
    ])

    this.logger.log(`Observability cleanup completed for project ${project.slug}`)
  }

  @StartActiveSpan()
  private async ensureProjectRepository(project: ProjectWithDetails) {
    const span = trace.getActiveSpan()
    span?.setAttribute('project.slug', project.slug)
    this.logger.verbose(`Ensuring observability project repository for ${project.slug}`)
    await this.gitlab.upsertProjectGroupSystemRepo(project.slug, OBSERVABILITY_REPOSITORY)
  }

  @StartActiveSpan()
  private async syncObservabilityConfig(project: ProjectWithDetails) {
    const span = trace.getActiveSpan()
    span?.setAttribute('project.slug', project.slug)
    this.logger.verbose(`Syncing observability Helm config for ${project.slug}`)

    await this.syncChartFiles(project)
    await this.syncValuesFile(project)
  }

  private async syncChartFiles(project: ProjectWithDetails) {
    const projectRepo = await this.gitlab.upsertProjectGroupSystemRepo(project.slug, OBSERVABILITY_REPOSITORY)
    const actions = await this.buildChartActions(projectRepo)
    await this.gitlab.maybeCreateCommit(projectRepo, 'ci: :robot_face: Sync observability chart', actions)
  }

  private async buildChartActions(repo: CondensedProjectSchemaWith<'id'>) {
    const chartAction = await this.gitlab.generateCreateOrUpdateAction(repo, 'main', OBSERVABILITY_CHART_FILE, observabilityChartContent(this.config.chartVersion))
    const templateAction = await this.gitlab.generateCreateOrUpdateAction(repo, 'main', OBSERVABILITY_TEMPLATE_FILE, observabilityTemplateContent)
    return [chartAction, templateAction].filter((a): a is NonNullable<typeof a> => a !== null)
  }

  private async syncValuesFile(project: ProjectWithDetails) {
    const valuesRepo = await this.client.getOrCreateValuesRepo()
    const repositoryUrl = await this.gitlab.getOrCreateProjectGroupPublicUrl()
    const projectGroupPath = generateKeycloakRootGroupPath(project)

    const projectValue = generateObservabilityProject(project, {
      repositoryUrl: `${repositoryUrl}/${project.slug}/${OBSERVABILITY_REPOSITORY}.git`,
      tenantRbacProd: generateGrafanaProdRbacGroupPaths(projectGroupPath),
      tenantRbacHProd: generateGrafanaHprodRbacGroupPaths(projectGroupPath),
    })

    await this.client.updateProjectConfig(valuesRepo, project, projectValue)
  }

  @StartActiveSpan()
  private async deleteProjectConfig(project: ProjectWithDetails) {
    const span = trace.getActiveSpan()
    span?.setAttribute('project.slug', project.slug)
    this.logger.verbose(`Deleting observability Helm config for ${project.slug}`)
    const valuesRepo = await this.client.getOrCreateValuesRepo()
    await this.client.deleteProjectConfig(valuesRepo, project)
  }

  @StartActiveSpan()
  private async syncKeycloakGroups(project: ProjectWithDetails) {
    const span = trace.getActiveSpan()
    span?.setAttribute('project.slug', project.slug)
    this.logger.verbose(`Syncing Grafana Keycloak groups for ${project.slug}`)

    const listPerms = getListPerms(project)
    const projectGroupPath = generateKeycloakRootGroupPath(project)
    const projectGroup = await this.keycloak.getGroupByPath(projectGroupPath)
    if (!projectGroup?.id) {
      throw new Error(`Unable to find project root Keycloak group ${projectGroupPath}`)
    }

    const subgroups = await this.ensureGrafanaSubGroups(projectGroup.id)
    await this.reconcileGroupMembership(subgroups, listPerms)
  }

  @StartActiveSpan()
  private async deleteKeycloakGroups(project: ProjectWithDetails) {
    const span = trace.getActiveSpan()
    span?.setAttribute('project.slug', project.slug)
    this.logger.verbose(`Deleting Grafana Keycloak groups for ${project.slug}`)

    const projectGroupPath = generateKeycloakRootGroupPath(project)
    const projectGroup = await this.keycloak.getGroupByPath(projectGroupPath)
    if (!projectGroup?.id) return

    for await (const subgroup of this.findGrafanaSubGroups(projectGroup.id)) {
      await this.keycloak.deleteGroup(subgroup.id)
      this.logger.log(`Deleted Grafana Keycloak group (groupId=${subgroup.id}, project=${project.slug})`)
    }
  }

  private async ensureGrafanaSubGroups(projectGroupId: string): Promise<Record<GrafanaSubGroupName, { id: string, members: { id: string }[] }>> {
    const grafanaGroup = await this.ensureKeycloakGroup(projectGroupId, GRAFANA_GROUP_NAME)

    const result = {} as Record<GrafanaSubGroupName, { id: string, members: { id: string }[] }>
    for (const name of grafanaRbacSubGroupNames()) {
      const group = await this.keycloak.getOrCreateSubGroupByName(grafanaGroup.id!, name)
      const members = await this.keycloak.getGroupMembers(group.id!)
      result[name] = {
        id: group.id!,
        members: members.map(m => ({ id: m.id! })).filter(m => m.id),
      }
    }
    return result
  }

  private async ensureKeycloakGroup(parentId: string, name: string): Promise<GroupRepresentation> {
    for await (const subgroup of this.keycloak.getSubGroups(parentId)) {
      if (subgroup.name === name && subgroup.id) {
        return { id: subgroup.id }
      }
    }
    return this.keycloak.getOrCreateSubGroupByName(parentId, name)
  }

  private async* findGrafanaSubGroups(projectGroupId: string): AsyncGenerator<{ id: string }> {
    for await (const subgroup of this.keycloak.getSubGroups(projectGroupId)) {
      if (subgroup.name === GRAFANA_GROUP_NAME && subgroup.id) {
        yield { id: subgroup.id }
      }
    }
  }

  private async reconcileGroupMembership(
    subgroups: Record<GrafanaSubGroupName, { id: string, members: { id: string }[] }>,
    listPerms: ListPerms,
  ): Promise<void> {
    const promises: Promise<void>[] = []
    for (const { subgroup, desired } of grafanaRbacMembershipMappings(listPerms)) {
      const group = subgroups[subgroup]
      const desiredSet = new Set(desired)

      for (const userId of desired) {
        if (!group.members.some(m => m.id === userId)) {
          promises.push(this.maybeAddUserToGroup(userId, group.id))
        }
      }

      for (const member of group.members) {
        if (!desiredSet.has(member.id)) {
          promises.push(this.maybeRemoveUserFromGroup(member.id, group.id))
        }
      }
    }
    await Promise.all(promises)
  }

  private async maybeAddUserToGroup(userId: string, groupId: string): Promise<void> {
    try {
      await this.keycloak.addUserToGroup(userId, groupId)
    } catch (err) {
      if (getErrorResponseStatus(err) !== 404) throw err
      this.logger.warn(`User ${userId} exists in the database but has no Keycloak account; skipping Grafana group add (groupId=${groupId})`)
    }
  }

  private async maybeRemoveUserFromGroup(userId: string, groupId: string): Promise<void> {
    try {
      await this.keycloak.removeUserFromGroup(userId, groupId)
    } catch (err) {
      if (getErrorResponseStatus(err) !== 404) throw err
      this.logger.warn(`User ${userId} exists in the database but has no Keycloak account; skipping Grafana group remove (groupId=${groupId})`)
    }
  }
}
