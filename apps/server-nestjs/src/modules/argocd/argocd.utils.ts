import { createHmac } from 'node:crypto'
import { generateNamespaceName, inClusterLabel } from '@cpn-console/shared'
import type { ProjectWithDetails } from './argocd-datastore.service.js'
import z from 'zod'

export const valuesSchema = z.object({
  common: z.object({
    'dso/project': z.string(),
    'dso/project.id': z.string(),
    'dso/project.slug': z.string(),
    'dso/environment': z.string(),
    'dso/environment.id': z.string(),
  }),
  argocd: z.object({
    cluster: z.string(),
    namespace: z.string(),
    project: z.string(),
    envChartVersion: z.string(),
    nsChartVersion: z.string(),
  }),
  environment: z.object({
    valueFileRepository: z.string(),
    valueFileRevision: z.string(),
    valueFilePath: z.string(),
    roGroup: z.string(),
    rwGroup: z.string(),
  }),
  application: z.object({
    quota: z.object({
      cpu: z.number(),
      gpu: z.number(),
      memory: z.string(),
    }),
    sourceRepositories: z.array(z.string()),
    destination: z.object({
      namespace: z.string(),
      name: z.string(),
    }),
    autosync: z.boolean(),
    vault: z.record(z.any()),
    repositories: z.array(z.object({
      repoURL: z.string(),
      targetRevision: z.string(),
      path: z.string(),
      valueFiles: z.array(z.string()),
    })),
  }),
})

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
  return [...zones]
}

export function splitExtraRepositories(extraRepositories: string | undefined): string[] {
  if (!extraRepositories) return []
  return extraRepositories.split(',').map(r => r.trim()).filter(r => r.length > 0)
}

export function formatRepositoriesValues(
  repositories: ProjectWithDetails['repositories'],
  repoUrl: string,
  envName: string,
) {
  return repositories
    .filter(repo => repo.isInfra)
    .map((repository) => {
      const valueFiles = splitExtraRepositories(repository.helmValuesFiles?.replaceAll('<env>', envName))
      return {
        repoURL: repoUrl,
        targetRevision: repository.deployRevision || 'HEAD',
        path: repository.deployPath || '.',
        valueFiles,
      } satisfies z.infer<typeof valuesSchema.shape.application.shape.repositories>[number]
    })
}

export function formatEnvironmentValues(
  infraProject: { http_url_to_repo: string },
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
  } satisfies z.infer<typeof valuesSchema.shape.environment>
}

export interface FormatSourceRepositoriesValuesOptions {
  gitlabPublicGroupUrl: string
  argocdExtraRepositories?: string
  projectPlugins?: ProjectWithDetails['plugins']
}

export function formatSourceRepositoriesValues(
  { gitlabPublicGroupUrl, argocdExtraRepositories, projectPlugins }: FormatSourceRepositoriesValuesOptions,
): string[] {
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
  environment: ProjectWithDetails['environments'][number]
}

export function formatCommon({ project, environment }: FormatCommonOptions) {
  return {
    'dso/project': project.name,
    'dso/project.id': project.id,
    'dso/project.slug': project.slug,
    'dso/environment': environment.name,
    'dso/environment.id': environment.id,
  } satisfies z.infer<typeof valuesSchema.shape.common>
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
  } satisfies z.infer<typeof valuesSchema.shape.argocd>
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
  environment,
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
        gitlabPublicGroupUrl,
        argocdExtraRepositories,
        projectPlugins: project.plugins,
      }),
      destination: {
        namespace: generateNamespaceName(project.id, environment.id),
        name: cluster.label,
      },
      autosync: environment.autosync,
      vault: vaultValues,
      repositories: formatRepositoriesValues(
        project.repositories,
        repoUrl,
        environment.name,
      ),
    },
  } satisfies z.infer<typeof valuesSchema>
}
