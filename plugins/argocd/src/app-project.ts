import type {
  BaseResources,
  Environment,
  Project,
} from '@cpn-console/hooks'
import { getConfig } from './utils.js'

export interface ArgoDestination {
  namespace?: string
  name?: string
  server?: string
}

export function getAppProjectObject({
  name,
  sourceRepositories,
  roGroup,
  rwGroup,
  destination,
  project,
  environment,
}: {
  name: string
  sourceRepositories: string[]
  roGroup: string
  rwGroup: string
  destination: ArgoDestination
  project: Project
  environment: Environment
}) {
  const minimalAppProject = getMinimalAppProjectPatch(
    destination,
    name,
    sourceRepositories,
    roGroup,
    rwGroup,
    project,
    environment,
  )
  minimalAppProject.apiVersion = 'argoproj.io/v1alpha1'
  minimalAppProject.metadata.namespace = getConfig().namespace
  return minimalAppProject
}

export function getMinimalAppProjectPatch(
  destination: ArgoDestination,
  name: string,
  sourceRepositories: string[],
  roGroup: string,
  rwGroup: string,
  project: Project,
  environment: Environment,
) {
  return {
    apiVersion: 'argoproj.io/v1alpha1',
    kind: 'AppProject',
    metadata: {
      name,
      labels: {
        'app.kubernetes.io/managed-by': 'dso-console',
        'dso/project': project.name,
        'dso/project.id': project.id,
        'dso/environment': environment.name,
        'dso/environment.id': environment.id,
        'dso/project.slug': project.slug,
      },
    },
    spec: {
      destinations: [destination],
      namespaceResourceWhitelist: [
        {
          group: '*',
          kind: '*',
        },
      ],
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
          policies: [
            `p, proj:${name}:ro-group, applications, get, ${name}/*, allow`,
          ],
        },
        {
          description: 'read-write group',
          groups: [rwGroup],
          name: 'rw-group',
          policies: [
            `p, proj:${name}:rw-group, applications, *, ${name}/*, allow`,
            `p, proj:${name}:rw-group, applications, delete, ${name}/*, allow`,
            `p, proj:${name}:rw-group, applications, create, ${name}/*, deny`,
          ],
        },
      ],
      sourceRepos: sourceRepositories,
    },
  } as BaseResources
}
