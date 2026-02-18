import type {
  ClusterObject,
  Environment,
  Project,
  Repository,
  StepCall,
} from '@cpn-console/hooks'
import { parseError } from '@cpn-console/hooks'
import { dump } from 'js-yaml'
import type { GitlabProjectApi } from '@cpn-console/gitlab-plugin/types/class.js'
import type { VaultProjectApi } from '@cpn-console/vault-plugin/types/vault-project-api.js'
import { generateNamespaceName, inClusterLabel } from '@cpn-console/shared'
import { generateAppProjectName, getConfig } from './utils.js'

function splitExtraRepositories(repos?: string): string[] {
  return repos ? repos.split(',').map(repo => repo.trim()) : []
}

const DSO_NS_CHART_VERSION = process.env.DSO_NS_CHART_VERSION ?? 'dso-ns-1.1.5'
const DSO_ENV_CHART_VERSION
  = process.env.DSO_ENV_CHART_VERSION ?? 'dso-env-1.6.0'

function getValueFilePath(p: Project, c: ClusterObject, e: Environment): string {
  return `${p.name}/${c.label}/${e.name}/values.yaml`
}

export const upsertProject: StepCall<Project> = async (payload) => {
  try {
    const project = payload.args
    const {
      gitlab: gitlabApi,
      keycloak: keycloakApi,
      vault: vaultApi,
    } = payload.apis

    const infraRepositories = project.repositories.filter(
      repo => repo.isInfra,
    )
    const sourceRepositories = [
      `${await gitlabApi.getPublicGroupUrl()}/**`,
      ...splitExtraRepositories(payload.config.argocd?.extraRepositories),
      ...splitExtraRepositories(project.store.argocd?.extraRepositories),
    ]

    await Promise.all(
      project.environments.map(async (environment) => {
        const nsName = generateNamespaceName(project.id, environment.id)
        const cluster = getCluster(project, environment)
        const infraProject = await gitlabApi.getOrCreateInfraProject(
          cluster.zone.slug,
        )
        const appProjectName = generateAppProjectName(
          project.slug,
          environment.name,
        )
        const roGroup = (await keycloakApi.getEnvGroup(environment.name))
          .subgroups.RO
        const rwGroup = (await keycloakApi.getEnvGroup(environment.name))
          .subgroups.RW

        await ensureInfraEnvValues(
          project,
          environment,
          nsName,
          roGroup,
          rwGroup,
          appProjectName,
          infraRepositories,
          infraProject.id,
          sourceRepositories,
          gitlabApi,
          vaultApi,
        )
      }),
    ])

    await removeInfraEnvValues(project, gitlabApi)

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

interface ArgoRepoSource {
  repoURL: string
  targetRevision: string
  path: string
  valueFiles: string[]
}
async function ensureInfraEnvValues(
  project: Project,
  environment: Environment,
  appNamespace: string,
  roGroup: string,
  rwGroup: string,
  appProjectName: string,
  infraRepositories: Repository[],
  repoId: number,
  sourceRepositories: string[],
  gitlabApi: GitlabProjectApi,
  vaultApi: VaultProjectApi,
) {
  const cluster = getCluster(project, environment)
  const infraProject = await gitlabApi.getProjectById(repoId)
  const valueFilePath = getValueFilePath(project, cluster, environment)
  const vaultValues = await vaultApi.Project.getValues()
  const repositories: ArgoRepoSource[] = await Promise.all([
    ...infraRepositories.map(async (repository) => {
      const repoURL = await gitlabApi.getPublicRepoUrl(
        repository.internalRepoName,
      )
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
    }),
  ])
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
      namespace: getConfig().namespace,
      project: appProjectName,
      envChartVersion: DSO_ENV_CHART_VERSION,
      nsChartVersion: DSO_NS_CHART_VERSION,
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
        namespace: appNamespace,
        name: cluster.label,
      },
      autosync: environment.autosync,
      vault: vaultValues,
      repositories,
    },
  }
  await gitlabApi.commitCreateOrUpdate(repoId, dump(values), valueFilePath)
}

function getCluster(p: Project, e: Environment): ClusterObject {
  const c = p.clusters.find(c => c.id === e.clusterId)
  if (!c) throw new Error(`Unable to find cluster ${e.id} for env ${e.name}`)
  return c
}

async function removeInfraEnvValues(
  project: Project,
  gitlabApi: GitlabProjectApi,
) {
  for (const z of getDistinctZones(project)) {
    const infraProject = await gitlabApi.getOrCreateInfraProject(z)
    const existingFiles = await gitlabApi.listFiles(infraProject.id, {
      path: `${project.name}/`,
      recursive: true,
    })
    const neededFiles = project.environments.map(env =>
      getValueFilePath(project, getCluster(project, env), env),
    )
    const filesToDelete: string[] = []
    for (const existingFile of existingFiles) {
      if (
        existingFile.name === 'values.yaml'
        && !neededFiles.find(f => f === existingFile.path)
      ) {
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

    for (const z of getDistinctZones(project)) {
      const infraProject = await gitlabApi.getOrCreateInfraProject(z)
      const projectValueFiles = await gitlabApi.listFiles(infraProject.id, {
        path: project.name,
        recursive: true,
      })
      const filesToDelete = projectValueFiles
        .filter(f => f.type === 'blob')
        .map(f => f.path)
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
