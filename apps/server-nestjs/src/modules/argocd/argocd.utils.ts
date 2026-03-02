import { createHmac } from 'node:crypto'
import { generateNamespaceName, inClusterLabel } from '@cpn-console/shared'
import type { ProjectWithDetails } from './argocd-datastore.service.js'

export interface RepositoryValue {
  repoURL: string
  targetRevision: string
  path: string
  valueFiles: string[]
}

export interface Values {
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
    repositories: RepositoryValue[]
  }
}

export function formatReadOnlyGroupName(projectSlug: string, environmentName: string) {
  return `/project-${projectSlug}/console/${environmentName}/RO`
}

export function formatReadWriteGroupName(projectSlug: string, environmentName: string) {
  return `/project-${projectSlug}/console/${environmentName}/RW`
}

export function formatAppProjectName(projectSlug: string, env: string) {
  const envHash = createHmac('sha256', '')
    .update(env)
    .digest('hex')
    .slice(0, 4)
  return `${projectSlug}-${env}-${envHash}`
}

export function formatEnvironmentValuesFilePath(project: { name: string }, cluster: { label: string }, env: { name: string }): string {
  return `${project.name}/${cluster.label}/${env.name}/values.yaml`
}

export function getDistinctZones(project: ProjectWithDetails) {
  const zones = new Set<string>()
  project.clusters.forEach(c => zones.add(c.zone.slug))
  return Array.from(zones)
}

export function splitExtraRepositories(extraRepositories: string | undefined): string[] {
  if (!extraRepositories) return []
  return extraRepositories.split(',').map(r => r.trim()).filter(r => r.length > 0)
}

export function formatRepositoriesValues(
  repositories: ProjectWithDetails['repositories'],
  repoUrl: string,
  envName: string,
): Values['application']['repositories'] {
  return repositories
    .filter(repo => repo.isInfra)
    .map((repository) => {
      const valueFiles = splitExtraRepositories(repository.helmValuesFiles?.replaceAll('<env>', envName))
      return {
        repoURL: repoUrl,
        targetRevision: repository.deployRevision || 'HEAD',
        path: repository.deployPath || '.',
        valueFiles,
      }
    })
}

export function formatEnvironmentValues(
  infraProject: { http_url_to_repo: string },
  valueFilePath: string,
  roGroup: string,
  rwGroup: string,
): Values['environment'] {
  return {
    valueFileRepository: infraProject.http_url_to_repo,
    valueFileRevision: 'HEAD',
    valueFilePath,
    roGroup,
    rwGroup,
  }
}

export interface FormatSourceRepositoriesValuesOptions {
  gitlabPublicGroupUrl: string
  argocdExtraRepositories?: string
  projectPlugins?: ProjectWithDetails['plugins']
}

export function formatSourceRepositoriesValues(
  options: FormatSourceRepositoriesValuesOptions,
): string[] {
  const { gitlabPublicGroupUrl, argocdExtraRepositories, projectPlugins } = options
  let projectExtraRepositories = ''
  if (projectPlugins) {
    const argocdPlugin = projectPlugins.find(p => p.pluginName === 'argocd' && p.key === 'extraRepositories')
    if (argocdPlugin) projectExtraRepositories = argocdPlugin.value
  }

  return [
    `${gitlabPublicGroupUrl}/**`,
    ...splitExtraRepositories(argocdExtraRepositories),
    ...splitExtraRepositories(projectExtraRepositories),
  ]
}

export interface FormatCommonOptions {
  project: ProjectWithDetails
  env: ProjectWithDetails['environments'][number]
}

export function formatCommon(options: FormatCommonOptions) {
  const { project, env } = options
  return {
    'dso/project': project.name,
    'dso/project.id': project.id,
    'dso/project.slug': project.slug,
    'dso/environment': env.name,
    'dso/environment.id': env.id,
  }
}

export interface FormatArgoCDValuesOptions {
  namespace: string
  project: string
  envChartVersion: string
  nsChartVersion: string
}

export function formatArgoCDValues(options: FormatArgoCDValuesOptions) {
  const { namespace, project, envChartVersion, nsChartVersion } = options
  return {
    cluster: inClusterLabel,
    namespace,
    project,
    envChartVersion,
    nsChartVersion,
  }
}

export interface FormatValuesOptions {
  project: ProjectWithDetails
  environment: ProjectWithDetails['environments'][number]
  cluster: ProjectWithDetails['clusters'][number]
  gitlabPublicGroupUrl: string
  argocdExtraRepositories?: string
  vaultValues: Record<string, any>
  infraProject: { http_url_to_repo: string }
  valueFilePath: string
  repoUrl: string
  argoNamespace: string
  envChartVersion: string
  nsChartVersion: string
}

export function formatValues({
  project,
  environment: env,
  cluster,
  gitlabPublicGroupUrl,
  argocdExtraRepositories,
  vaultValues,
  infraProject,
  valueFilePath,
  repoUrl,
  argoNamespace,
  envChartVersion,
  nsChartVersion,
}: FormatValuesOptions): Values {
  return {
    common: formatCommon({ project, env }),
    argocd: formatArgoCDValues({
      namespace: argoNamespace,
      project: formatAppProjectName(project.slug, env.name),
      envChartVersion,
      nsChartVersion,
    }),
    environment: formatEnvironmentValues(
      infraProject,
      valueFilePath,
      formatReadOnlyGroupName(project.slug, env.name),
      formatReadWriteGroupName(project.slug, env.name),
    ),
    application: {
      quota: {
        cpu: env.cpu,
        gpu: env.gpu,
        memory: `${env.memory}Gi`,
      },
      sourceRepositories: formatSourceRepositoriesValues({
        gitlabPublicGroupUrl,
        argocdExtraRepositories,
        projectPlugins: project.plugins,
      }),
      destination: {
        namespace: generateNamespaceName(project.id, env.id),
        name: cluster.label,
      },
      autosync: env.autosync,
      vault: vaultValues,
      repositories: formatRepositoriesValues(
        project.repositories,
        repoUrl,
        env.name,
      ),
    },
  }
}
