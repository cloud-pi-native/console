import { dirname } from 'node:path'
import type { ClusterObject, Environment, ListMinimumResources, Project, Repository, StepCall } from '@cpn-console/hooks'
import { parseError, uniqueResource } from '@cpn-console/hooks'
import { dump } from 'js-yaml'
import type { GitlabProjectApi } from '@cpn-console/gitlab-plugin/types/class.js'
import type { VaultProjectApi } from '@cpn-console/vault-plugin/types/class.js'
import { PatchUtils } from '@kubernetes/client-node'
import { inClusterLabel } from '@cpn-console/shared'
import { generateAppProjectName, generateApplicationName, getConfig, getCustomK8sApi } from './utils.js'
import { getApplicationObject, getMinimalApplicationObject } from './applications.js'
import { getAppProjectObject, getMinimalAppProjectPatch } from './app-project.js'

export const patchOptions = { headers: { 'Content-type': PatchUtils.PATCH_FORMAT_JSON_MERGE_PATCH } }

export interface ArgoDestination {
  namespace?: string
  name?: string
  server?: string
}

function splitExtraRepositories(repos?: string): string[] {
  return repos
    ? repos.split(',').map(repo => repo.trim())
    : []
}

const getValueFilePath = (p: Project, c: ClusterObject, e: Environment): string => `${p.name}/${c.label}/${e.name}/values.yaml`

export const upsertProject: StepCall<Project> = async (payload) => {
  try {
    const customK8sApi = getCustomK8sApi()
    const project = payload.args
    const { gitlab: gitlabApi, keycloak: keycloakApi, vault: vaultApi } = payload.apis
    const projectSelectorOld = `dso/organization=${project.organization.name},dso/project=${project.name},app.kubernetes.io/managed-by=dso-console`
    const projectSelector = `dso/project.slug=${project.slug},app.kubernetes.io/managed-by=dso-console`
    const projectSelector2 = `dso/project.id=${project.id},app.kubernetes.io/managed-by=dso-console`

    const infraRepositories = project.repositories.filter(repo => repo.isInfra)
    const sourceRepos = [
      ...await Promise.all(infraRepositories.map(repo => gitlabApi.getRepoUrl(repo.internalRepoName))),
      ...splitExtraRepositories(payload.config.argocd?.extraRepositories),
      ...splitExtraRepositories(project.store.argocd?.extraRepositories),
    ]

    // first create or patch resources
    const applicationsOld = await customK8sApi.listNamespacedCustomObject('argoproj.io', 'v1alpha1', getConfig().namespace, 'applications', undefined, undefined, undefined, undefined, projectSelectorOld) as ListMinimumResources
    const applicationsNew = await customK8sApi.listNamespacedCustomObject('argoproj.io', 'v1alpha1', getConfig().namespace, 'applications', undefined, undefined, undefined, undefined, projectSelector) as ListMinimumResources
    const applicationsNew2 = await customK8sApi.listNamespacedCustomObject('argoproj.io', 'v1alpha1', getConfig().namespace, 'applications', undefined, undefined, undefined, undefined, projectSelector2) as ListMinimumResources

    const appProjectsOld = await customK8sApi.listNamespacedCustomObject('argoproj.io', 'v1alpha1', getConfig().namespace, 'appprojects', undefined, undefined, undefined, undefined, projectSelectorOld) as ListMinimumResources
    const appProjectsNew = await customK8sApi.listNamespacedCustomObject('argoproj.io', 'v1alpha1', getConfig().namespace, 'appprojects', undefined, undefined, undefined, undefined, projectSelector) as ListMinimumResources
    const appProjectsNew2 = await customK8sApi.listNamespacedCustomObject('argoproj.io', 'v1alpha1', getConfig().namespace, 'appprojects', undefined, undefined, undefined, undefined, projectSelector2) as ListMinimumResources

    const applications = uniqueResource(applicationsOld.body.items, applicationsNew.body.items, applicationsNew2.body.items)
    const appProjects = uniqueResource(appProjectsOld.body.items, appProjectsNew.body.items, appProjectsNew2.body.items)

    await Promise.all([
      ...project.environments.map(async (environment) => {
        if (!environment.apis.kubernetes) {
          return
        }
        const nsName = await environment.apis.kubernetes.getNsName()
        const cluster = getCluster(project, environment)
        const infraProject = await gitlabApi.getOrCreateInfraProject(cluster.zone.slug)
        const appProjectName = generateAppProjectName(project.slug, environment.name)
        const destination: ArgoDestination = {
          namespace: nsName,
          name: cluster.label,
        }
        const roGroup = (await keycloakApi.getEnvGroup(environment.name)).subgroups.RO
        const rwGroup = (await keycloakApi.getEnvGroup(environment.name)).subgroups.RW

        await ensureInfraEnvValues(
          project,
          environment,
          nsName,
          roGroup,
          rwGroup,
          appProjectName,
          infraRepositories,
          infraProject.id,
          gitlabApi,
          vaultApi,
        )

        if (cluster.label !== inClusterLabel && !cluster.user.keyData && !cluster.user.token) {
          console.log(`Direct argocd API calls are disabled for cluster ${cluster.label}`)
          return undefined
        }

        // @ts-ignore
        const appProject = findAppProject(appProjects, environment.name)
        if (appProject) {
          const minimalAppProject = getMinimalAppProjectPatch(
            destination,
            appProjectName,
            sourceRepos,
            roGroup,
            rwGroup,
            project,
            environment,
          )
          await customK8sApi.patchNamespacedCustomObject('argoproj.io', 'v1alpha1', getConfig().namespace, 'appprojects', appProjectName, minimalAppProject, undefined, undefined, undefined, patchOptions)
        } else {
          const appProjectObject = getAppProjectObject({
            name: appProjectName,
            sourceRepos,
            destination,
            roGroup,
            rwGroup,
            environment,
            project,
          })
          await customK8sApi.createNamespacedCustomObject('argoproj.io', 'v1alpha1', getConfig().namespace, 'appprojects', appProjectObject)
        }

        // manage every infra repositories
        return Promise.all(infraRepositories.map(async (repository) => {
          const application = findApplication(applications, repository.internalRepoName, environment.name)
          const applicationName = generateApplicationName(project.slug, environment.name, repository.internalRepoName)
          const repoURL = await gitlabApi.getRepoUrl(repository.internalRepoName)

          if (application) {
            const minimalPatch = getMinimalApplicationObject({
              name: applicationName,
              destination,
              repoURL,
              appProjectName,
              project,
              repository,
              environment,
            })
            await customK8sApi.patchNamespacedCustomObject('argoproj.io', 'v1alpha1', getConfig().namespace, 'applications', application.metadata.name, minimalPatch, undefined, undefined, undefined, patchOptions)
          } else {
            const applicationObject = getApplicationObject({
              name: applicationName,
              destination,
              repoURL,
              appProjectName,
              project,
              repository,
              environment,
            })
            await customK8sApi.createNamespacedCustomObject('argoproj.io', 'v1alpha1', getConfig().namespace, 'applications', applicationObject)
          }
        }))
      }),
    ])

    await removeInfraEnvValues(project, gitlabApi)

    // then destroy what should not exist
    // @ts-ignore
    for (const application of applications) {
      const appEnv = application.metadata.labels['dso/environment']
      const appRepo = application.metadata.labels['dso/repository']
      const env = project.environments.find(env => env.name === appEnv)
      const repo = infraRepositories.find(repo => repo.internalRepoName === appRepo)
      if (!env || !repo) {
        console.log(`Application ${application.metadata.name} should not exists anymore`)
        await customK8sApi.deleteNamespacedCustomObject('argoproj.io', 'v1alpha1', getConfig().namespace, 'applications', application.metadata.name)
      }
    }

    // @ts-ignore
    for (const appProject of appProjects) {
      const projectEnv = appProject.metadata.labels['dso/environment']
      const env = project.environments.find(env => env.name === projectEnv)
      if (!env) {
        console.log(`AppProject ${appProject.metadata.name} should not exists anymore`)
        await customK8sApi.deleteNamespacedCustomObject('argoproj.io', 'v1alpha1', getConfig().namespace, 'appprojects', appProject.metadata.name)
      }
    }

    return {
      status: {
        result: 'OK',
        message: 'Up-to-date',
      },
    }
  } catch (error) {
    return {
      error: parseError(error),
      status: {
        result: 'KO',
        message: 'Failed',
      },
    }
  }
}

function findApplication(applications: any[], repository: string, environment: string) {
  return applications.find(app =>
    app.metadata.labels['dso/repository'] === repository
    && app.metadata.labels['dso/environment'] === environment,
  )
}

function findAppProject(applications: any[], environment: string) {
  return applications.find(app =>
    app.metadata.labels['dso/environment'] === environment,
  )
}

interface ArgoRepoSource {
  repoURL: string
  targetRevision: string
  path: string
  valueFiles: string[]
}
async function ensureInfraEnvValues(project: Project, environment: Environment, appNamespace: string, roGroup: string, rwGroup: string, appProjectName: string, sourceRepos: Repository[], repoId: number, gitlabApi: GitlabProjectApi, vaultApi: VaultProjectApi) {
  const infraAppsRepoUrl = await gitlabApi.getRepoUrl('infra-apps')
  const gitlabGroupUrl = dirname(infraAppsRepoUrl)
  const cluster = getCluster(project, environment)
  const infraProject = await gitlabApi.getProjectById(repoId)
  const valueFilePath = getValueFilePath(project, cluster, environment)
  const vaultCredentials = await vaultApi.Project.getCredentials()
  const repositories: ArgoRepoSource[] = await Promise.all([
    getArgoRepoSource('infra-apps', environment.name, gitlabApi),
    ...sourceRepos.map(repo => getArgoRepoSource(repo.internalRepoName, environment.name, gitlabApi)),
  ])
  const values = {
    common: {
      'dso/organization': project.organization.name,
      'dso/project': project.name,
      'dso/project.id': project.id,
      'dso/project.slug': project.slug,
      'dso/environment': environment.name,
    },
    argocd: {
      cluster: inClusterLabel,
      namespace: getConfig().namespace,
      project: appProjectName,
      envChartVersion: process.env.DSO_ENV_CHART_VERSION ?? 'dso-env-1.4.0',
      nsChartVersion: process.env.DSO_NS_CHART_VERSION ?? 'dso-ns-1.1.1',
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
        cpu: environment.quota.cpu,
        memory: environment.quota.memory,
      },
      sourceReposPrefix: gitlabGroupUrl,
      destination: {
        namespace: appNamespace,
        name: cluster.label,
      },
      vault: vaultCredentials,
      repositories,
    },
  }
  await gitlabApi.commitCreateOrUpdate(repoId, dump(values), valueFilePath)
}

async function getArgoRepoSource(repoName: string, env: string, gitlabApi: GitlabProjectApi): Promise<ArgoRepoSource> {
  const targetRevision = 'HEAD'
  const valueFiles = [] // Empty means not a Helm repository
  let path = '.'
  const repoId = await gitlabApi.getProjectId(repoName)
  const repoURL = await gitlabApi.getRepoUrl(repoName)
  try {
    const files = await gitlabApi.listFiles(repoId, { path: '/', ref: 'HEAD', recursive: false })
    const result = files.find(f => f.name === 'values.yaml')
    if (result) {
      valueFiles.push('values.yaml')
      path = dirname(result.path)
      const valuesEnv = `values-${env}.yaml`
      if (files.find(f => (path === '.' && f.path === valuesEnv) || f.path === `${path}/${valuesEnv}`)) {
        valueFiles.push(valuesEnv)
      }
    }
  } catch (error) {
    console.log(`Error ignored when trying to list files of repository ${repoName}: ${error.message}`)
  }
  return {
    repoURL,
    targetRevision,
    path,
    valueFiles,
  }
}

function getCluster(p: Project, e: Environment): ClusterObject {
  const c = p.clusters.find(c => c.id === e.clusterId)
  if (!c)
    throw new Error(`Unable to find cluster ${e.id} for env ${e.name}`)
  return c
}

async function removeInfraEnvValues(project: Project, gitlabApi: GitlabProjectApi) {
  for (const z of getDistinctZones(project)) {
    const infraProject = await gitlabApi.getOrCreateInfraProject(z)
    const existingFiles = await gitlabApi.listFiles(infraProject.id, { path: `${project.name}/`, recursive: true })
    const neededFiles = project.environments.map(env => getValueFilePath(project, getCluster(project, env), env))
    const filesToDelete: string[] = []
    for (const existingFile of existingFiles) {
      if (existingFile.name === 'values.yaml' && !neededFiles.find(f => f === existingFile.path)) {
        filesToDelete.push(existingFile.path)
      }
    }
    await gitlabApi.commitDelete(infraProject.id, filesToDelete)
  }
}

function getDistinctZones(project: Project) {
  const zones: Set<string> = new Set()
  project.clusters.forEach(c => zones.add(c.zone.slug))
  return zones
}

export const deleteProject: StepCall<Project> = async (payload) => {
  try {
    const project = payload.args
    const { gitlab: gitlabApi } = payload.apis
    const customK8sApi = getCustomK8sApi()
    const projectSelector = `dso/organization=${project.organization.name},dso/projet=${project.name},app.kubernetes.io/managed-by=dso-console`

    const applications = await customK8sApi.listNamespacedCustomObject('argoproj.io', 'v1alpha1', getConfig().namespace, 'applications', undefined, undefined, undefined, undefined, projectSelector) as ListMinimumResources

    for (const application of applications.body.items) {
      await customK8sApi.deleteNamespacedCustomObject('argoproj.io', 'v1alpha1', getConfig().namespace, 'applications', application.metadata.name)
    }

    const appProjects = await customK8sApi.listNamespacedCustomObject('argoproj.io', 'v1alpha1', getConfig().namespace, 'applications', undefined, undefined, undefined, undefined, projectSelector) as ListMinimumResources

    for (const appProject of appProjects.body.items) {
      await customK8sApi.deleteNamespacedCustomObject('argoproj.io', 'v1alpha1', getConfig().namespace, 'appprojects', appProject.metadata.name)
    }

    for (const z of getDistinctZones(project)) {
      const infraProject = await gitlabApi.getOrCreateInfraProject(z)
      const projectValueFiles = await gitlabApi.listFiles(infraProject.id, { path: project.name, recursive: true })
      const filesToDelete = projectValueFiles.filter(f => f.type === 'blob').map(f => f.path)
      await gitlabApi.commitDelete(infraProject.id, filesToDelete)
    }

    return {
      status: {
        result: 'OK',
        message: 'Up-to-date',
      },
    }
  } catch (error) {
    return {
      error: parseError(error),
      status: {
        result: 'KO',
        message: 'Failed',
      },
    }
  }
}
