import { type StepCall, type Project, parseError, Environment, ClusterObject } from '@cpn-console/hooks'
import { generateAppProjectName, generateApplicationName, getConfig, getCustomK8sApi } from './utils.js'
import { getApplicationObject } from './applications.js'
import { getAppProjectObject } from './app-project.js'
import { dump } from 'js-yaml'
import { GitlabProjectApi } from '@cpn-console/gitlab-plugin/types/class.js'
import { dirname } from 'path'

export type ArgoDestination = {
  namespace?: string
  name?: string
  server?: string
}

export const upsertProject: StepCall<Project> = async (payload) => {
  try {
    const customK8sApi = getCustomK8sApi()
    const project = payload.args
    const { kubernetes: kubeApi, gitlab: gitlabApi, keycloak: keycloakApi } = payload.apis
    const projectSelector = `dso/organization=${project.organization.name},dso/project=${project.name},app.kubernetes.io/managed-by=dso-console`

    const infraRepositories = project.repositories.filter(repo => repo.isInfra)
    const sourceRepos = await Promise.all(infraRepositories.map(repo => gitlabApi.getRepoUrl(repo.internalRepoName)))

    // first create or patch resources
    const applications = await customK8sApi.listNamespacedCustomObject('argoproj.io', 'v1alpha1', getConfig().namespace, 'applications', undefined, undefined, undefined, undefined, projectSelector)

    const appProjects = await customK8sApi.listNamespacedCustomObject('argoproj.io', 'v1alpha1', getConfig().namespace, 'appprojects', undefined, undefined, undefined, undefined, projectSelector)

    const infraAppsRepoUrl = await gitlabApi.getRepoUrl('infra-apps')

    for (const environment of project.environments) {
      const cluster = getCluster(project, environment)
      const infraProject = await gitlabApi.getOrCreateInfraProject(cluster.zone.slug)
      const appProjectName = generateAppProjectName(project.organization.name, project.name, environment.name)
      const appNamespace = kubeApi.namespaces[environment.name].nsObject.metadata.name
      const destination: ArgoDestination = {
        namespace: appNamespace,
        name: cluster.label,
      }
      const roGroup = (await keycloakApi.getEnvGroup(environment.name)).subgroups.RO
      const rwGroup = (await keycloakApi.getEnvGroup(environment.name)).subgroups.RW

      await ensureInfraEnvValues(
        project, environment, appNamespace, roGroup, rwGroup,
        appProjectName, infraAppsRepoUrl, sourceRepos, infraProject.id, gitlabApi,
      )

      if (!cluster.user.keyData) {
        console.log(`Direct argocd API calls are disabled for cluster ${cluster.label}`)
        continue
      }

      // @ts-ignore
      const appProject = findAppProject(appProjects.body.items, environment.name)
      if (appProject) {
        const { spec } = getMinimalAppProjectPatch(
          destination,
          appProjectName,
          sourceRepos,
          roGroup,
          rwGroup,
        )
        appProject.spec = spec

        await customK8sApi.replaceNamespacedCustomObject('argoproj.io', 'v1alpha1', getConfig().namespace, 'appprojects', appProjectName, appProject)
      } else {
        const appProjectObject = getAppProjectObject({
          name: appProjectName,
          sourceRepos,
          destination,
          roGroup,
          rwGroup,
        })
        appProjectObject.metadata.labels['dso/organization'] = project.organization.name
        appProjectObject.metadata.labels['dso/project'] = project.name
        appProjectObject.metadata.labels['dso/environment'] = environment.name
        await customK8sApi.createNamespacedCustomObject('argoproj.io', 'v1alpha1', getConfig().namespace, 'appprojects', appProjectObject)
      }

      // manage every infra repositories
      for (const repository of infraRepositories) {
        // @ts-ignore
        const application = findApplication(applications.body.items, repository.internalRepoName, environment.name)
        const repoURL = await gitlabApi.getRepoUrl(repository.internalRepoName)
        if (application) {
          application.spec.destination = destination
          application.spec.project = appProjectName
          application.spec.source.repoURL = repoURL

          await customK8sApi.replaceNamespacedCustomObject('argoproj.io', 'v1alpha1', getConfig().namespace, 'applications', application.metadata.name, application)
        } else {
          const applicationName = generateApplicationName(project.organization.name, project.name, environment.name, repository.internalRepoName)
          const applicationObject = getApplicationObject({
            name: applicationName,
            destination,
            repoURL,
            appProjectName,
          })
          applicationObject.metadata.labels['dso/organization'] = project.organization.name
          applicationObject.metadata.labels['dso/project'] = project.name
          applicationObject.metadata.labels['dso/environment'] = environment.name
          applicationObject.metadata.labels['dso/repository'] = repository.internalRepoName

          await customK8sApi.createNamespacedCustomObject('argoproj.io', 'v1alpha1', getConfig().namespace, 'applications', applicationObject)
        }
      }
    }
    await removeInfraEnvValues(project, gitlabApi)

    // then destroy what should not exist
    // @ts-ignore
    for (const application of applications.body.items) {
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
    for (const appProject of appProjects.body.items) {
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

const findApplication = (applications: any[], repository: string, environment: string) => applications.find(app =>
  app.metadata.labels['dso/repository'] === repository &&
  app.metadata.labels['dso/environment'] === environment,
)

const findAppProject = (applications: any[], environment: string) => applications.find(app =>
  app.metadata.labels['dso/environment'] === environment,
)

type ArgoRepoSource = {
  repoURL: string
  targetRevision: string
  path: string
}
const ensureInfraEnvValues = async (
  project: Project,
  environment: Environment,
  appNamespace: string,
  roGroup: string,
  rwGroup: string,
  appProjectName: string,
  infraAppsRepoUrl: string,
  sourceRepos: string[],
  repoId: number,
  gitlabApi: GitlabProjectApi,
) => {
  const gitlabGroupUrl = dirname(infraAppsRepoUrl)
  const cluster = getCluster(project, environment)
  const infraProject = await gitlabApi.getProjectById(repoId)
  const valueFilePath = getValueFilePath(project, cluster, environment)
  const repositories: ArgoRepoSource[] = [
    {
      repoURL: infraAppsRepoUrl,
      targetRevision: 'HEAD',
      path: '.',
    },
    ...sourceRepos.map(url => ({
      repoURL: url,
      targetRevision: 'HEAD',
      path: '.',
    })),

  ]
  const values = {
    commonLabels: {
      'dso/organization': project.organization.name,
      'dso/project': project.name,
      'dso/environment': environment.name,
    },
    argocd: {
      namespace: getConfig().namespace,
      project: appProjectName,
      chartVersion: process.env.DSO_ENV_CHART_VERSION || 'dso-env-1.0.0',
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
      repositories,
    },
  }
  await gitlabApi.commitCreateOrUpdate(repoId, dump(values), valueFilePath)
}

const getCluster = (p: Project, e: Environment): ClusterObject => {
  const c = p.clusters.find(c => c.id === e.clusterId)
  if (!c) throw new Error(`Unable to find cluster ${e.id} for env ${e.name}`)
  return c
}
const getValueFilePath = (p: Project, c: ClusterObject, e: Environment): string => `${p.name}/${c.label}/${e.name}/values.yaml`

const removeInfraEnvValues = async (
  project: Project,
  gitlabApi: GitlabProjectApi,
) => {
  for (const z of getDistinctZones(project)) {
    const infraProject = await gitlabApi.getOrCreateInfraProject(z)
    const existingFiles = await gitlabApi.listFiles(infraProject.id, `${project.name}/`)
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

const getDistinctZones = (project: Project) => {
  const zones: Set<string> = new Set()
  project.clusters.map(c => zones.add(c.zone.slug))
  return zones
}

export const deleteProject: StepCall<Project> = async (payload) => {
  try {
    const project = payload.args
    const { gitlab: gitlabApi } = payload.apis
    const customK8sApi = getCustomK8sApi()
    const projectSelector = `dso/organization=${project.organization.name},dso/projet=${project.name},app.kubernetes.io/managed-by=dso-console`

    const applications = await customK8sApi.listNamespacedCustomObject('argoproj.io', 'v1alpha1', getConfig().namespace, 'applications', undefined, undefined, undefined, undefined, projectSelector)

    // @ts-ignore
    for (const application of applications.body.items) {
      await customK8sApi.deleteNamespacedCustomObject('argoproj.io', 'v1alpha1', getConfig().namespace, 'applications', application.metadata.name)
    }

    const appProjects = await customK8sApi.listNamespacedCustomObject('argoproj.io', 'v1alpha1', getConfig().namespace, 'applications', undefined, undefined, undefined, undefined, projectSelector)

    // @ts-ignore
    for (const appProject of appProjects.body.items) {
      await customK8sApi.deleteNamespacedCustomObject('argoproj.io', 'v1alpha1', getConfig().namespace, 'appprojects', appProject.metadata.name)
    }

    for (const z of getDistinctZones(project)) {
      const infraProject = await gitlabApi.getOrCreateInfraProject(z)
      const projectValueFiles = await gitlabApi.listFiles(infraProject.id, project.name)
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

const getMinimalAppProjectPatch = (destination: ArgoDestination, appProjectName: string, sourceRepos: string[], roGroup: string, rwGroup: string) => ({
  spec: {
    destinations: [destination],
    namespaceResourceWhitelist: [{
      group: '*',
      kind: '*',
    }],
    namespaceResourceBlacklist: [
      {
        group: 'v1',
        kind: 'ResourceQuota',
      },
    ],
    roles: [
      {
        description: 'read-only group',
        groups: [roGroup],
        name: 'ro-group',
        policies: [`p, proj:${appProjectName}:ro-group, applications, get, ${appProjectName}/*, allow`],
      },
      {
        description: 'read-write group',
        groups: [rwGroup],
        name: 'rw-group',
        policies: [
          `p, proj:${appProjectName}:rw-group, applications, *, ${appProjectName}/*, allow`,
          `p, proj:${appProjectName}:rw-group, applications, delete, ${appProjectName}/*, allow`,
          `p, proj:${appProjectName}:rw-group, applications, create, ${appProjectName}/*, deny`,
        ],
      },
    ],
    sourceRepos,
  },
})
