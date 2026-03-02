import type { OnModuleInit } from '@nestjs/common'
import { Injectable, Logger } from '@nestjs/common'
import { OnEvent } from '@nestjs/event-emitter'
import { Cron, CronExpression } from '@nestjs/schedule'
import { createHmac } from 'node:crypto'
import { dump } from 'js-yaml'
import type {
  Project,
  Environment,
  ClusterObject,
} from '@cpn-console/hooks'
import { generateNamespaceName, inClusterLabel, removeTrailingSlash } from '@cpn-console/shared'

import type { ArgoCDDatastoreService } from './argocd-datastore.service'
import type { ConfigurationService } from '@/cpin-module/infrastructure/configuration/configuration.service'
import type { GitlabService } from '../gitlab/gitlab.service'
import type { VaultService } from '../vault/vault.service'

@Injectable()
export class ArgoCDControllerService implements OnModuleInit {
  private readonly logger = new Logger(ArgoCDControllerService.name)

  constructor(
    private readonly argoCDDatastore: ArgoCDDatastoreService,
    private readonly configService: ConfigurationService,
    private readonly gitlabService: GitlabService,
    private readonly vaultService: VaultService,
  ) {
    this.logger.log('ArgoCDControllerService initialized')
  }

  onModuleInit() {
    this.handleCron()
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async handleCron() {
    this.logger.log('Starting ArgoCD reconciliation')
    await this.reconcile()
  }

  @OnEvent('project.deleted')
  async handleProjectDeleted(project: Project) {
    this.logger.log(`Handling project delete for ${project.slug}`)
    await this.deleteProject(project)
  }

  private async reconcile() {
    const projects = await this.argoCDDatastore.getAllProjects()
    const results: Promise<{ status: string, reason?: any, value?: any }>[] = []

    for (const project of projects) {
      // Sync environments
      for (const environment of project.environments) {
        // TODO: Get actual groups from Keycloak or similar service
        const roGroup = `/project-${project.slug}/console/${environment.name}/RO`
        const rwGroup = `/project-${project.slug}/console/${environment.name}/RW`

        results.push(
          Promise.allSettled([
            this.ensureInfraEnvValues(project as unknown as Project, environment as unknown as Environment, roGroup, rwGroup),
          ]).then((res) => {
            if (res[0].status === 'rejected') {
              this.logger.error(`Failed to reconcile environment ${environment.name} for project ${project.slug}: ${res[0].reason}`)
              return { status: 'rejected', reason: res[0].reason }
            }
            return { status: 'fulfilled', value: undefined }
          }),
        )
      }

      // Cleanup removed environments
      results.push(
        Promise.allSettled([
          this.removeInfraEnvValues(project as unknown as Project),
        ]).then((res) => {
          if (res[0].status === 'rejected') {
            this.logger.error(`Failed to cleanup project ${project.slug}: ${res[0].reason}`)
            return { status: 'rejected', reason: res[0].reason }
          }
          return { status: 'fulfilled', value: undefined }
        }),
      )
    }

    return Promise.all(results)
  }

  private get namespace() {
    return this.configService.argoNamespace
  }

  private get url() {
    return this.configService.argocdUrl ? removeTrailingSlash(this.configService.argocdUrl) : ''
  }

  private generateAppProjectName(projectSlug: string, env: string) {
    const envHash = createHmac('sha256', '')
      .update(env)
      .digest('hex')
      .slice(0, 4)
    return `${projectSlug}-${env}-${envHash}`
  }

  private getCluster(project: Project, environment: Environment): ClusterObject {
    const cluster = project.clusters.find(c => c.id === environment.clusterId)
    if (!cluster) throw new Error(`Unable to find cluster ${environment.clusterId} for env ${environment.name}`)
    return cluster
  }

  private getValueFilePath(project: Project, cluster: ClusterObject, environment: Environment): string {
    return `${project.name}/${cluster.label}/${environment.name}/values.yaml`
  }

  private getDistinctZones(project: Project) {
    const zones = new Set<string>()
    project.clusters.forEach(c => zones.add(c.zone.slug))
    return zones
  }

  private splitExtraRepositories(repos?: string): string[] {
    return repos ? repos.split(',').map(repo => repo.trim()) : []
  }

  async ensureInfraEnvValues(
    project: Project,
    environment: Environment,
    roGroup: string,
    rwGroup: string,
  ) {
    const nsName = generateNamespaceName(project.id, environment.id)
    const cluster = this.getCluster(project, environment)
    const appProjectName = this.generateAppProjectName(project.slug, environment.name)

    const infraProject = await this.gitlabService.getOrCreateInfraProject(cluster.zone.slug)
    const valueFilePath = this.getValueFilePath(project, cluster, environment)

    // TODO: vaultService should probably take projectId or something
    const vaultValues = await this.vaultService.getProjectValues(project.id)

    let extraRepositories = project.store?.argocd?.extraRepositories
    if (!extraRepositories && 'plugins' in project) {
      const plugins = (project as any).plugins as Array<{ pluginName: string, key: string, value: string }>
      const argocdPlugin = plugins.find(p => p.pluginName === 'argocd' && p.key === 'extraRepositories')
      if (argocdPlugin) extraRepositories = argocdPlugin.value
    }

    const infraRepositories = project.repositories.filter(repo => repo.isInfra)
    const sourceRepositories = [
      `${await this.gitlabService.getPublicGroupUrl()}/**`,
      ...this.splitExtraRepositories(this.configService.argocdExtraRepositories),
      ...this.splitExtraRepositories(extraRepositories),
    ]

    const repositories = await Promise.all(infraRepositories.map(async (repository) => {
      const repoURL = await this.gitlabService.getPublicRepoUrl(repository.internalRepoName)
      const valueFiles = repository.helmValuesFiles
        ? repository.helmValuesFiles
            .replaceAll('<env>', environment.name)
            .split(',')
        : []
      return {
        id: repository.id,
        name: repository.internalRepoName,
        repoURL,
        targetRevision: repository.deployRevision || 'HEAD',
        path: repository.deployPath || '.',
        valueFiles,
      }
    }))

    const values = {
      common: {
        'dso/project': project.name,
        'dso/project.id': project.id,
        'dso/project.slug': project.slug,
        'dso/environment': environment.name,
        'dso/environment.id': environment.id,
      },
      argocd: {
        cluster: inClusterLabel,
        namespace: this.namespace,
        project: appProjectName,
        envChartVersion: process.env.DSO_ENV_CHART_VERSION ?? 'dso-env-1.6.0',
        nsChartVersion: process.env.DSO_NS_CHART_VERSION ?? 'dso-ns-1.1.5',
      },
      environment: {
        valueFileRepository: infraProject.http_url_to_repo,
        valueFileRevision: 'HEAD',
        valueFilePath,
        roGroup,
        rwGroup,
      },
      application: {
        quota: {
          cpu: environment.cpu,
          gpu: environment.gpu,
          memory: `${environment.memory}Gi`,
        },
        sourceRepositories,
        destination: {
          namespace: nsName,
          name: cluster.label,
        },
        autosync: environment.autosync,
        vault: vaultValues,
        repositories,
      },
    }

    await this.gitlabService.commitCreateOrUpdate(infraProject.id, dump(values), valueFilePath)
  }

  async removeInfraEnvValues(project: Project) {
    for (const zoneSlug of this.getDistinctZones(project)) {
      const infraProject = await this.gitlabService.getOrCreateInfraProject(zoneSlug)
      const existingFiles = await this.gitlabService.listFiles(infraProject.id, {
        path: `${project.name}/`,
        recursive: true,
      })

      const neededFiles = project.environments.map(env =>
        this.getValueFilePath(project, this.getCluster(project, env), env),
      )

      const filesToDelete: string[] = []
      for (const existingFile of existingFiles) {
        if (
          existingFile.name === 'values.yaml'
          && !neededFiles.includes(existingFile.path)
        ) {
          filesToDelete.push(existingFile.path)
        }
      }

      if (filesToDelete.length > 0) {
        await this.gitlabService.commitDelete(infraProject.id, filesToDelete)
      }
    }
  }

  async deleteProject(project: Project) {
    for (const zoneSlug of this.getDistinctZones(project)) {
      const infraProject = await this.gitlabService.getOrCreateInfraProject(zoneSlug)
      const projectValueFiles = await this.gitlabService.listFiles(infraProject.id, {
        path: project.name,
        recursive: true,
      })

      const filesToDelete = projectValueFiles
        .filter(f => f.type === 'blob')
        .map(f => f.path)

      if (filesToDelete.length > 0) {
        await this.gitlabService.commitDelete(infraProject.id, filesToDelete)
      }
    }
  }
}
