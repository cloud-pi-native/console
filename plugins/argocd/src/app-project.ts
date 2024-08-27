import { getConfig } from './utils.js'

export interface ArgoDestination {
  namespace?: string
  name?: string
  server?: string
}

export function getAppProjectObject({ name, sourceRepos, roGroup, rwGroup, destination }:
{ name: string, sourceRepos: string[], roGroup: string, rwGroup: string, destination: ArgoDestination }) {
  return {
    apiVersion: 'argoproj.io/v1alpha1',
    kind: 'AppProject',
    metadata: {
      name,
      namespace: getConfig().namespace,
      labels: {
        'app.kubernetes.io/managed-by': 'dso-console',
      } as Record<string, string>,
    },
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
          policies: [`p, proj:${name}:ro-group, applications, get, ${name}/*, allow`],
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
      sourceRepos,
    },
  }
}
