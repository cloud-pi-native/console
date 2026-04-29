import type { CommitAction, CondensedProjectSchema, ProjectSchema, SimpleProjectSchema } from '@gitbeaker/core'
import type { ProjectWithDetails } from './argocd-datastore.service'
import { createHmac } from 'node:crypto'
import { generateNamespaceName, inClusterLabel } from '@cpn-console/shared'
import { Inject, Injectable, Logger } from '@nestjs/common'
import { OnEvent } from '@nestjs/event-emitter'
import { Cron, CronExpression } from '@nestjs/schedule'
import { trace } from '@opentelemetry/api'
import { stringify } from 'yaml'
import { GitlabClientService } from '../gitlab/gitlab-client.service'
import { ConfigurationService } from '../infrastructure/configuration/configuration.service'
import { StartActiveSpan } from '../infrastructure/telemetry/telemetry.decorator'
import { VaultClientService } from '../vault/vault-client.service'
import { ArgoCDDatastoreService } from './argocd-datastore.service'
import {
  CONSOLE_ADMIN_GROUP_PATH,
  PLATFORM_ADMIN_GROUP_PATH,
  PLATFORM_READONLY_GROUP_PATH,
  PLATFORM_SECURITY_GROUP_PATH,
  PROJECT_ADMIN_GROUP_PATH_SUFFIX,
  PROJECT_DEVELOPER_GROUP_PATH_SUFFIX,
  PROJECT_DEVOPS_GROUP_PATH_SUFFIX,
  PROJECT_READONLY_GROUP_PATH_SUFFIX,
  PROJECT_SECURITY_GROUP_PATH_SUFFIX,
} from './argocd.constant'

@Injectable()
export class ArgoCDService {
  private readonly logger = new Logger(ArgoCDService.name)

  constructor(
    @Inject(ArgoCDDatastoreService) private readonly argoCDDatastore: ArgoCDDatastoreService,
    @Inject(ConfigurationService) private readonly config: ConfigurationService,
    @Inject(GitlabClientService) private readonly gitlab: GitlabClientService,
    @Inject(VaultClientService) private readonly vault: VaultClientService,
  ) {
    this.logger.log('ArgoCDService initialized')
  }

  @OnEvent('project.upsert')
  @StartActiveSpan()
  async handleUpsert(project: ProjectWithDetails) {
    const span = trace.getActiveSpan()
    span?.setAttribute('project.slug', project.slug)
    this.logger.log(`Handling a project upsert event for ${project.slug}`)
    await this.ensureProject(project)
    this.logger.log(`ArgoCD sync completed for project ${project.slug}`)
  }

  @OnEvent('project.delete')
  @StartActiveSpan()
  async handleDelete(project: ProjectWithDetails) {
    const span = trace.getActiveSpan()
    span?.setAttribute('project.slug', project.slug)
    this.logger.log(`Handling a project delete event for ${project.slug}`)
    await this.ensureProject(project)
    this.logger.log(`ArgoCD sync completed for project ${project.slug}`)
  }

  @Cron(CronExpression.EVERY_HOUR)
  @StartActiveSpan()
  async handleCron() {
    this.logger.log('Starting ArgoCD reconciliation')
    const projects = await this.argoCDDatastore.getAllProjects()
    const span = trace.getActiveSpan()
    span?.setAttribute('argocd.projects.count', projects.length)
    this.logger.log(`Loaded ${projects.length} projects for ArgoCD reconciliation`)
    await this.ensureProjects(projects)
    this.logger.log(`ArgoCD reconciliation completed (${projects.length})`)
  }

  @StartActiveSpan()
  private async ensureProjects(projects: ProjectWithDetails[]) {
    const span = trace.getActiveSpan()
    span?.setAttribute('argocd.projects.count', projects.length)
    this.logger.verbose(`Reconciling ArgoCD projects (count=${projects.length})`)
    await Promise.all(projects.map(project => this.ensureProject(project)))
  }

  @StartActiveSpan()
  private async ensureProject(project: ProjectWithDetails) {
    const span = trace.getActiveSpan()
    span?.setAttribute('project.slug', project.slug)
    this.logger.verbose(`Reconciling ArgoCD project ${project.slug}`)
    await this.ensureZones(project)
    this.logger.verbose(`ArgoCD project reconciled (${project.slug})`)
  }

  @StartActiveSpan()
  private async ensureZones(
    project: ProjectWithDetails,
  ): Promise<void> {
    const span = trace.getActiveSpan()
    span?.setAttribute('project.slug', project.slug)
    const zones = getDistinctZones(project)
    span?.setAttribute('argocd.zones.count', zones.length)
    this.logger.verbose(`Reconciling ArgoCD zones for project ${project.slug} (count=${zones.length})`)
    await Promise.all(zones.map(zoneSlug => this.ensureZone(project, zoneSlug)))
  }

  @StartActiveSpan()
  private async ensureZone(
    project: ProjectWithDetails,
    zoneSlug: string,
  ): Promise<void> {
    const span = trace.getActiveSpan()
    span?.setAttribute('project.slug', project.slug)
    const infraProject = await this.gitlab.getOrCreateInfraGroupRepo(zoneSlug)
    span?.setAttributes({
      'argocd.repo.id': infraProject.id,
      'argocd.repo.path': infraProject.path_with_namespace,
      'zone.slug': zoneSlug,
    })
    this.logger.verbose(`Reconciling ArgoCD zone for project ${project.slug} in zone ${zoneSlug} (repoId=${infraProject.id})`)

    const actions = await this.generateEnvironmentActions(project, infraProject, zoneSlug)

    span?.setAttribute('argocd.repo.actions.count', actions.length)
    if (actions.length === 0) {
      this.logger.verbose(`No ArgoCD changes need to be committed for project ${project.slug} in zone ${zoneSlug}`)
      return
    }

    this.logger.log(`Applying ArgoCD changes for project ${project.slug} in zone ${zoneSlug} (actions=${actions.length})`)
    await this.gitlab.maybeCreateCommit(infraProject, `ci: :robot_face: Sync ${project.slug}`, actions)
  }

  private async generateEnvironmentActions(
    project: ProjectWithDetails,
    infraProject: ProjectSchema,
    zoneSlug: string,
  ) {
    const environmentActions = await this.generateEnvironmentsUpdateActions(
      project,
      project.environments,
      infraProject,
      zoneSlug,
    )
    const deploymentActions = await this.generateDeploymentsUpdateActions(
      project,
      infraProject,
      zoneSlug,
    )
    const purgeEnvironmentActions = await this.generatePurgeEnvironmentActions(
      project,
      infraProject,
      zoneSlug,
    )
    return [
      ...(deploymentActions.length ? deploymentActions : environmentActions),
      ...purgeEnvironmentActions,
    ] satisfies CommitAction[]
  }

  private async generatePurgeEnvironmentActions(
    project: ProjectWithDetails,
    infraProject: CondensedProjectSchema,
    zoneSlug: string,
  ): Promise<CommitAction[]> {
    const neededFiles = new Set<string>()
    const clusterLabelsInZone = new Set(
      project.environments
        .filter(e => e.cluster.zone.slug === zoneSlug)
        .map(e => e.cluster.label),
    )

    project.environments.forEach((env) => {
      if (env.cluster?.zone.slug !== zoneSlug) return
      neededFiles.add(formatEnvironmentValuesFilePath(project, env.cluster, env))
    })

    const existingFiles = await this.gitlab.listFiles(infraProject, {
      path: `${project.name}/`,
      recursive: true,
    })

    const projectPrefix = `${project.name}/`
    const actions = existingFiles
      .filter((existingFile) => {
        if (existingFile.name !== 'values.yaml') return false
        if (!existingFile.path.startsWith(projectPrefix)) return false

        const remaining = existingFile.path.slice(projectPrefix.length)
        const clusterLabel = remaining.split('/')[0]
        if (!clusterLabel || !clusterLabelsInZone.has(clusterLabel)) return false

        return !neededFiles.has(existingFile.path)
      })
      .map(existingFile => ({ action: 'delete', filePath: existingFile.path } satisfies CommitAction))

    this.logger.verbose(`Computed ArgoCD purge actions for project ${project.slug} in zone ${zoneSlug} (actions=${actions.length})`)

    return actions
  }

  private async generateEnvironmentsUpdateActions(
    project: ProjectWithDetails,
    environments: ProjectWithDetails['environments'],
    infraProject: SimpleProjectSchema,
    zoneSlug: string,
  ): Promise<CommitAction[]> {
    this.logger.verbose(`Computing ArgoCD environment actions for project ${project.slug} in zone ${zoneSlug} (environments=${environments.length})`)
    const actions = await Promise.all(
      environments
        .filter(env => env.cluster?.zone.slug === zoneSlug)
        .map(env => this.generateEnvironmentUpdateAction(project, env, infraProject)),
    )
    const filteredActions: CommitAction[] = actions.filter(a => !!a)
    this.logger.verbose(`Computed ArgoCD environment actions for project ${project.slug} in zone ${zoneSlug} (actions=${filteredActions.length})`)
    return filteredActions
  }

  private async generateEnvironmentUpdateAction(
    project: ProjectWithDetails,
    environment: ProjectWithDetails['environments'][number],
    infraProject: SimpleProjectSchema,
  ): Promise<CommitAction | null> {
    const span = trace.getActiveSpan()
    span?.setAttributes({
      'project.slug': project.slug,
      'environment.id': environment.id,
      'environment.name': environment.name,
    })
    const vaultValues = await this.vault.readProjectValues(project.id) ?? {}
    const cluster = environment.cluster
    if (!cluster) {
      this.logger.warn(`Cluster not found for environment ${environment.id} in project ${project.slug}`)
      throw new Error(`Cluster not found for environment ${environment.id}`)
    }
    span?.setAttribute('zone.slug', cluster.zone.slug)

    const valueFilePath = formatEnvironmentValuesFilePath(project, cluster, environment)

    const repo = project.repositories.find(r => r.isInfra)
    if (!repo) {
      this.logger.warn(`Infrastructure repository not found for project ${project.slug} (projectId=${project.id})`)
      return null
    }
    const gitlabPublicProjectUrl = `${(await this.gitlab.getOrCreateProjectGroupPublicUrl())}/${project.slug}`

    const values = formatValues({
      project,
      environment,
      cluster,
      gitlabPublicProjectUrl,
      argocdExtraRepositories: this.config.argocdExtraRepositories,
      infraProject,
      valueFilePath,
      vaultValues,
      argoNamespace: this.config.argoNamespace,
      envChartVersion: this.config.dsoEnvChartVersion,
      nsChartVersion: this.config.dsoNsChartVersion,
    })

    return this.gitlab.generateCreateOrUpdateAction(
      infraProject,
      'main',
      valueFilePath,
      stringify(values),
    )
  }

  private async generateDeploymentsUpdateActions(
    project: ProjectWithDetails,
    infraProject: SimpleProjectSchema,
    zoneSlug: string,
  ): Promise<CommitAction[]> {
    this.logger.verbose(`Computing ArgoCD deployment actions for project ${project.slug} in zone ${zoneSlug} (environments=${project.deployments.length})`)
    const environments = project.deployments.reduce<
      Record<string, { environment: ProjectWithDetails['environments'][number], deployments: ProjectWithDetails['deployments'][number][] }>
    >((acc, deployment) => {
      const environment = deployment.environment
      if (acc[environment.id]) acc[environment.id].deployments.push(deployment)
      else acc[environment.id] = { environment, deployments: [deployment] }
      return acc
    }, {})

    const actions = await Promise.all(
      Object.values(environments)
        .filter(({ environment }) => environment.cluster?.zone.slug === zoneSlug)
        .map(({ environment, deployments }) => this.generateEnvironmentWithDeploymentsUpdateAction(project, environment, deployments, infraProject)),
    )

    const filteredActions: CommitAction[] = actions.filter(a => !!a)
    this.logger.verbose(`Computed ArgoCD deployment actions for project ${project.slug} in zone ${zoneSlug} (actions=${filteredActions.length})`)
    return filteredActions
  }

  private async generateEnvironmentWithDeploymentsUpdateAction(
    project: ProjectWithDetails,
    environment: ProjectWithDetails['environments'][number],
    deployments: ProjectWithDetails['deployments'][number][],
    infraProject: SimpleProjectSchema,
  ): Promise<CommitAction | null> {
    const span = trace.getActiveSpan()
    span?.setAttributes({
      'project.slug': project.slug,
      'environment.id': environment.id,
      'environment.name': environment.name,
    })
    const vaultValues = await this.vault.readProjectValues(project.id) ?? {}
    const cluster = environment.cluster
    if (!cluster) {
      this.logger.warn(`Cluster not found for environment ${environment.id} in project ${project.slug}`)
      throw new Error(`Cluster not found for environment ${environment.id}`)
    }
    span?.setAttribute('zone.slug', cluster.zone.slug)

    const valueFilePath = formatEnvironmentValuesFilePath(project, cluster, environment)

    const gitlabPublicProjectUrl = `${(await this.gitlab.getOrCreateProjectGroupPublicUrl())}/${project.slug}`

    const values = formatValues({
      project,
      environment,
      cluster,
      gitlabPublicProjectUrl,
      argocdExtraRepositories: this.config.argocdExtraRepositories,
      infraProject,
      valueFilePath,
      vaultValues,
      argoNamespace: this.config.argoNamespace,
      envChartVersion: this.config.dsoEnvChartVersion,
      nsChartVersion: this.config.dsoNsChartVersion,
      deployments,
    })

    return this.gitlab.generateCreateOrUpdateAction(
      infraProject,
      'main',
      valueFilePath,
      stringify(values),
    )
  }
}

interface ValuesSchema {
  common: {
    'dso/project': string
    'dso/project.id': string
    'dso/project.slug': string
    'dso/environment': string
    'dso/environment.id': string
  }
  argocd: {
    cluster: string
    namespace: string
    project: string
    envChartVersion: string
    nsChartVersion: string
  }
  environment: {
    valueFileRepository: string
    valueFileRevision: string
    valueFilePath: string
    roGroup: string
    rwGroup: string
    consoleAdminGroup: string
    platformAdminGroup: string
    platformReadonlyGroup: string
    platformSecurityGroup: string
    projectAdminGroup: string
    projectDevopsGroup: string
    projectDevelopperGroup: string
    projectSecurityGroup: string
    projectReadonlyGroup: string
  }
  application: {
    quota: {
      cpu: number
      gpu: number
      memory: string
    }
    sourceRepositories: string[]
    destination: {
      namespace: string
      name: string
    }
    autosync: boolean
    vault: Record<string, any>
    repositories: {
      name: string
      id: string
      repoURL: string
      targetRevision: string
      path: string
      valueFiles: string[]
    }[]
  }
  features: {
    fineGrainedRoles: {
      enabled: boolean
    }
  }
}

function formatReadOnlyGroupName(projectSlug: string, environmentName: string) {
  return generateEnvironmentConsoleGroupPath(projectSlug, environmentName, 'RO')
}

function formatReadWriteGroupName(projectSlug: string, environmentName: string) {
  return generateEnvironmentConsoleGroupPath(projectSlug, environmentName, 'RW')
}

function generateEnvironmentConsoleGroupPath(projectSlug: string, environmentName: string, access: 'RO' | 'RW') {
  return `/${projectSlug}/console/${environmentName}/${access}`
}

function generateProjectConsoleGroupPath(projectSlug: string, suffix: string) {
  return `/${projectSlug}${suffix}`
}

function formatAppProjectName(projectSlug: string, env: string) {
  const envHash = createHmac('sha256', '')
    .update(env)
    .digest('hex')
    .slice(0, 4)
  return `${projectSlug}-${env}-${envHash}`
}

function formatEnvironmentValuesFilePath(project: { name: string }, cluster: { label: string }, env: { name: string }): string {
  return `${project.name}/${cluster.label}/${env.name}/values.yaml`
}

function getDistinctZones(project: ProjectWithDetails) {
  const zones = new Set<string>()
  project.environments.forEach(e => zones.add(e.cluster.zone.slug))
  return [...zones]
}

function splitExtraRepositories(extraRepositories: string | undefined): string[] {
  if (!extraRepositories) return []
  return extraRepositories.split(',').map(r => r.trim()).filter(r => r.length > 0)
}

function formatRepositoriesValues(
  repositories: ProjectWithDetails['repositories'],
  gitlabPublicProjectUrl: string,
  envName: string,
) {
  return repositories
    .filter(repo => repo.isInfra)
    .map((repository) => {
      const valueFiles = splitExtraRepositories(repository.helmValuesFiles?.replaceAll('<env>', envName))
      return {
        id: repository.id,
        name: repository.internalRepoName,
        repoURL: `${gitlabPublicProjectUrl}/${repository.internalRepoName}.git`,
        targetRevision: repository.deployRevision || 'HEAD',
        path: repository.deployPath || '.',
        valueFiles,
      } satisfies ValuesSchema['application']['repositories'][number]
    })
}

function formatRepositoriesValuesFromDeployments(
  deployments: ProjectWithDetails['deployments'][number][],
  gitlabPublicProjectUrl: string,
  envName: string,
) {
  return deployments.map(deployment =>
    deployment.deploymentSources
      .map((source) => {
        const valueFiles = splitExtraRepositories(source.helmValuesFiles?.replaceAll('<env>', envName))
        return {
          name: source.repository.internalRepoName,
          id: source.repository.id,
          repoURL: `${gitlabPublicProjectUrl}/${source.repository.internalRepoName}.git`,
          targetRevision: source.targetRevision || 'HEAD',
          path: source.path || '.',
          valueFiles,
        } satisfies ValuesSchema['application']['repositories'][number]
      }),
  ).flat()
}

function formatEnvironmentValues(
  project: ProjectWithDetails,
  infraProject: SimpleProjectSchema,
  valueFilePath: string,
  roGroup: string,
  rwGroup: string,
) {
  return {
    valueFileRepository: infraProject.http_url_to_repo,
    valueFileRevision: 'HEAD',
    valueFilePath,
    roGroup,
    rwGroup,
    consoleAdminGroup: CONSOLE_ADMIN_GROUP_PATH,
    platformAdminGroup: PLATFORM_ADMIN_GROUP_PATH,
    platformReadonlyGroup: PLATFORM_READONLY_GROUP_PATH,
    platformSecurityGroup: PLATFORM_SECURITY_GROUP_PATH,
    projectAdminGroup: generateProjectConsoleGroupPath(project.slug, PROJECT_ADMIN_GROUP_PATH_SUFFIX),
    projectDevopsGroup: generateProjectConsoleGroupPath(project.slug, PROJECT_DEVOPS_GROUP_PATH_SUFFIX),
    projectDevelopperGroup: generateProjectConsoleGroupPath(project.slug, PROJECT_DEVELOPER_GROUP_PATH_SUFFIX),
    projectSecurityGroup: generateProjectConsoleGroupPath(project.slug, PROJECT_SECURITY_GROUP_PATH_SUFFIX),
    projectReadonlyGroup: generateProjectConsoleGroupPath(project.slug, PROJECT_READONLY_GROUP_PATH_SUFFIX),
  } satisfies ValuesSchema['environment']
}

interface FormatSourceRepositoriesValuesOptions {
  gitlabPublicProjectUrl: string
  argocdExtraRepositories?: string
  projectPlugins?: ProjectWithDetails['plugins']
}

function formatSourceRepositoriesValues(
  { gitlabPublicProjectUrl, argocdExtraRepositories, projectPlugins }: FormatSourceRepositoriesValuesOptions,
): string[] {
  let projectExtraRepositories = ''
  if (projectPlugins) {
    const argocdPlugin = projectPlugins.find(p => p.pluginName === 'argocd' && p.key === 'extraRepositories')
    if (argocdPlugin) projectExtraRepositories = argocdPlugin.value
  }

  return [
    `${gitlabPublicProjectUrl}/**`,
    ...splitExtraRepositories(argocdExtraRepositories),
    ...splitExtraRepositories(projectExtraRepositories),
  ]
}

interface FormatCommonOptions {
  project: ProjectWithDetails
  environment: ProjectWithDetails['environments'][number]
}

function formatCommon({ project, environment }: FormatCommonOptions) {
  return {
    'dso/project': project.name,
    'dso/project.id': project.id,
    'dso/project.slug': project.slug,
    'dso/environment': environment.name,
    'dso/environment.id': environment.id,
  } satisfies ValuesSchema['common']
}

interface FormatArgoCDValuesOptions {
  namespace: string
  project: string
  envChartVersion: string
  nsChartVersion: string
}

function formatArgoCDValues(options: FormatArgoCDValuesOptions) {
  const { namespace, project, envChartVersion, nsChartVersion } = options
  return {
    cluster: inClusterLabel,
    namespace,
    project,
    envChartVersion,
    nsChartVersion,
  } satisfies ValuesSchema['argocd']
}

interface FormatValuesOptions {
  project: ProjectWithDetails
  environment: ProjectWithDetails['environments'][number]
  cluster: ProjectWithDetails['environments'][number]['cluster']
  gitlabPublicProjectUrl: string
  argocdExtraRepositories?: string
  vaultValues: Record<string, any>
  infraProject: SimpleProjectSchema
  valueFilePath: string
  argoNamespace: string
  envChartVersion: string
  nsChartVersion: string
  deployments?: ProjectWithDetails['deployments'][number][]
}

function formatValues({
  project,
  environment,
  cluster,
  gitlabPublicProjectUrl,
  argocdExtraRepositories,
  vaultValues,
  infraProject,
  valueFilePath,
  argoNamespace,
  envChartVersion,
  nsChartVersion,
  deployments,
}: FormatValuesOptions) {
  return {
    common: formatCommon({ project, environment }),
    argocd: formatArgoCDValues({
      namespace: argoNamespace,
      project: formatAppProjectName(project.slug, environment.name),
      envChartVersion,
      nsChartVersion,
    }),
    environment: formatEnvironmentValues(
      project,
      infraProject,
      valueFilePath,
      formatReadOnlyGroupName(project.slug, environment.name),
      formatReadWriteGroupName(project.slug, environment.name),
    ),
    application: {
      quota: {
        cpu: environment.cpu,
        gpu: environment.gpu,
        memory: `${environment.memory}Gi`,
      },
      sourceRepositories: formatSourceRepositoriesValues({
        gitlabPublicProjectUrl,
        argocdExtraRepositories,
        projectPlugins: project.plugins,
      }),
      destination: {
        namespace: generateNamespaceName(project.id, environment.id),
        name: cluster.label,
      },
      autosync: environment.autosync,
      vault: vaultValues,
      repositories: deployments
        ? formatRepositoriesValuesFromDeployments(deployments, gitlabPublicProjectUrl, environment.name)
        : formatRepositoriesValues(
            project.repositories,
            gitlabPublicProjectUrl,
            environment.name,
          ),
    },
    features: {
      fineGrainedRoles: {
        enabled: true,
      },
    },
  } satisfies ValuesSchema
}
