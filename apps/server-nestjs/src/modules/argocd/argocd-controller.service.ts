import type { OnModuleInit } from '@nestjs/common'
import { Inject, Injectable, Logger } from '@nestjs/common'
import { OnEvent } from '@nestjs/event-emitter'
import { Cron, CronExpression } from '@nestjs/schedule'
import { dump } from 'js-yaml'

import { ArgoCDDatastoreService, type ProjectWithDetails } from './argocd-datastore.service'
import { ConfigurationService } from '@/cpin-module/infrastructure/configuration/configuration.service'
import { GitlabService } from '../gitlab/gitlab.service'
import { VaultService } from '../vault/vault.service'
import {
  formatEnvironmentValuesFilePath,
  formatValues,
  getDistinctZones,
} from './argocd.utils'

@Injectable()
export class ArgoCDControllerService implements OnModuleInit {
  private readonly logger = new Logger(ArgoCDControllerService.name)

  constructor(
    @Inject(ArgoCDDatastoreService) private readonly argoCDDatastore: ArgoCDDatastoreService,
    @Inject(ConfigurationService) private readonly config: ConfigurationService,
    @Inject(GitlabService) private readonly gitlab: GitlabService,
    @Inject(VaultService) private readonly vault: VaultService,
  ) {
    this.logger.log('ArgoCDControllerService initialized')
  }

  onModuleInit() {
    this.handleCron()
  }

  @OnEvent('project.upsert')
  async handleUpsert(project: ProjectWithDetails) {
    this.logger.log(`Handling project upsert for ${project.slug}`)
    return this.reconcile()
  }

  @OnEvent('project.delete')
  async handleDelete(project: ProjectWithDetails) {
    this.logger.log(`Handling project delete for ${project.slug}`)
    return this.reconcile()
  }

  @Cron(CronExpression.EVERY_HOUR)
  async handleCron() {
    this.logger.log('Starting ArgoCD reconciliation')
    await this.reconcile()
  }

  async reconcile() {
    const projects = await this.argoCDDatastore.getAllProjects()
    const results: PromiseSettledResult<void>[] = []

    const projectResults = await Promise.all(projects.map(async (project) => {
      const pResults: PromiseSettledResult<void>[] = []

      const ensureResults = await Promise.allSettled(
        project.environments.map(env => this.generateValues(project, env)),
      )
      pResults.push(...ensureResults)

      const cleanupResults = await this.cleanupStaleValues(project)
      pResults.push(...cleanupResults)

      return pResults
    }))

    results.push(...projectResults.flat())

    results.forEach((result) => {
      if (result.status === 'rejected') {
        this.logger.error(`Reconciliation failed: ${result.reason}`)
      }
    })

    return results
  }

  private async cleanupStaleValues(project: ProjectWithDetails) {
    const zones = getDistinctZones(project)
    return Promise.allSettled(zones.map(async (zoneSlug) => {
      const infraProject = await this.gitlab.getOrCreateInfraGroupRepo(zoneSlug)
      const existingFiles = await this.gitlab.listFiles(infraProject.id, {
        path: `${project.name}/`,
        recursive: true,
      })

      const neededFiles = project.environments
        .filter((env) => {
          const cluster = project.clusters.find(c => c.id === env.clusterId)
          return cluster?.zone.slug === zoneSlug
        })
        .map((env) => {
          const cluster = project.clusters.find(c => c.id === env.clusterId)!
          return formatEnvironmentValuesFilePath(project, cluster, env)
        })

      const filesToDelete = existingFiles
        .filter((existingFile) => {
          return (
            existingFile.name === 'values.yaml'
            && !neededFiles.includes(existingFile.path)
          )
        })
        .map(existingFile => existingFile.path)

      await this.gitlab.maybeCommitDelete(infraProject.id, filesToDelete)
    }))
  }

  async generateValues(
    project: ProjectWithDetails,
    environment: ProjectWithDetails['environments'][number],
  ) {
    const vaultValues = await this.vault.getProjectValues(project.id)
    const cluster = project.clusters.find(c => c.id === environment.clusterId)
    if (!cluster) throw new Error(`Cluster not found for environment ${environment.id}`)

    const infraProject = await this.gitlab.getOrCreateInfraGroupRepo(cluster.zone.slug)
    const valueFilePath = formatEnvironmentValuesFilePath(project, cluster, environment)

    const repo = project.repositories.find(r => r.isInfra)
    if (!repo) throw new Error(`Infra repository not found for project ${project.id}`)
    const repoUrl = await this.gitlab.getInfraGroupRepoPublicUrl(repo.internalRepoName)

    const values = formatValues({
      project,
      environment,
      cluster,
      gitlabPublicGroupUrl: await this.gitlab.getProjectGroupPublicUrl(),
      argocdExtraRepositories: this.config.argocdExtraRepositories,
      infraProject,
      valueFilePath,
      repoUrl,
      vaultValues,
      argoNamespace: this.config.argoNamespace,
      envChartVersion: this.config.dsoEnvChartVersion,
      nsChartVersion: this.config.dsoNsChartVersion,
    })

    await this.gitlab.maybeCommitUpdate(infraProject.id, [{
      content: dump(values),
      filePath: valueFilePath,
    }], `ci: :robot_face: Update ${valueFilePath}`)
  }
}
