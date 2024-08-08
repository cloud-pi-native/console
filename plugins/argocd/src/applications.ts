import { ArgoDestination } from './app-project.js'
import { getConfig } from './utils.js'

export const getApplicationObject = (
  { name, destination, repoURL, appProjectName }:
  { name: string, destination: ArgoDestination, repoURL: string, appProjectName: string },
) => {
  return {
    apiVersion: 'argoproj.io/v1alpha1',
    kind: 'Application',
    metadata: {
      name,
      namespace: getConfig().namespace,
      labels: {
        'app.kubernetes.io/managed-by': 'dso-console',
      } as Record<string, string>,
    },
    spec: {
      destination,
      project: appProjectName,
      source: {
        path: 'helm/',
        repoURL,
        targetRevision: 'HEAD',
      },
      syncPolicy: {
        automated: {
          prune: false,
          selfHeal: false,
        },
        syncOptions: [
          'CreateNamespace=false',
          'RespectIgnoreDifferences=true',
          'ApplyOutOfSyncOnly=true',
        ],
      },
    },
  }
}
