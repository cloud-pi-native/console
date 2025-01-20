import type { BaseResources, Environment, ProjectLite, Repository } from '@cpn-console/hooks'
import type { ArgoDestination } from './app-project.js'
import { getConfig } from './utils.js'

export function getApplicationObject({ name, destination, repoURL, appProjectName, project, environment, repository }:
{ name: string, destination: ArgoDestination, repoURL: string, appProjectName: string, project: ProjectLite, environment: Environment, repository: Repository }) {
  const minimalAppProject = getMinimalApplicationObject({ name, destination, repoURL, appProjectName, environment, project, repository })

  minimalAppProject.metadata.namespace = getConfig().namespace
  minimalAppProject.spec.source.path = 'helm/'
  minimalAppProject.spec.source.targetRevision = 'HEAD'
  minimalAppProject.spec.syncPolicy = {
    automated: {
      prune: false,
      selfHeal: false,
    },
    syncOptions: [
      'CreateNamespace=false',
      'RespectIgnoreDifferences=true',
      'ApplyOutOfSyncOnly=true',
    ],
  }
  return minimalAppProject
}

export function getMinimalApplicationObject({ name, destination, repoURL, appProjectName, project, environment, repository }:
{ name: string, destination: ArgoDestination, repoURL: string, appProjectName: string, project: ProjectLite, environment: Environment, repository: Repository }) {
  return {
    apiVersion: 'argoproj.io/v1alpha1',
    kind: 'Application',
    metadata: {
      name,
      labels: {
        'app.kubernetes.io/managed-by': 'dso-console',
        'dso/project': project.name,
        'dso/project.id': project.id,
        'dso/project.slug': project.slug,
        'dso/environment': environment.name,
        'dso/environment.id': environment.id,
        'dso/repository': repository.internalRepoName,
        'dso/repository.id': repository.id,
      },
    },
    spec: {
      destination,
      project: appProjectName,
      source: {
        repoURL,
      },
    },
  } as BaseResources
}
