import type { AppProject, Application } from '@kubernetes-models/argo-cd/argoproj.io/v1alpha1'
import { ArgoDestination, removeRepoFromApplicationProject } from './app-project.js'
import { argoNamespace, customK8sApi } from './init.js'

export const createApplication = async (
  { applicationName, destination, repo, appProject }:
  { applicationName: string, destination: ArgoDestination, repo: any, appProject: AppProject,},
) => {
  const applications = await customK8sApi.listNamespacedCustomObject('argoproj.io', 'v1alpha1', argoNamespace, 'applications', undefined, undefined, undefined, `metadata.name=${applicationName}`)
  // @ts-ignore Les types de la lib ne semblent pas corrects
  const application = applications.body.items.find(app => app.metadata.name === applicationName)
  if (!application) {
    const result = await customK8sApi.createNamespacedCustomObject('argoproj.io', 'v1alpha1', argoNamespace, 'applications', getApplicationObject({
      name: applicationName,
      destination,
      repoURL: repo.url,
      appProjectName: appProject.metadata.name,
    }))
    return result.body
  }
  return application
}

export const deleteApplication = async ({ applicationName, repoUrl }) => {
  const applications = await customK8sApi.listNamespacedCustomObject('argoproj.io', 'v1alpha1', argoNamespace, 'applications', undefined, undefined, undefined, `metadata.name=${applicationName}`)
  // @ts-ignore Les types de la lib ne semblent pas corrects
  const application = applications.body.items.find(app => app.metadata.name === applicationName)
  if (application) {
    const appProjectName = application.spec.project
    await removeRepoFromApplicationProject({ appProjectName, repoUrl })
    await customK8sApi.deleteNamespacedCustomObject('argoproj.io', 'v1alpha1', argoNamespace, 'applications', applicationName)
  }
}

const getApplicationObject = (
  { name, destination, repoURL, appProjectName }:
  { name: string, destination: ArgoDestination, repoURL: string, appProjectName: string },
): Application => {
  return {
    apiVersion: 'argoproj.io/v1alpha1',
    kind: 'Application',
    metadata: {
      name,
      namespace: argoNamespace,
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
          prune: true,
          selfHeal: true,
        },
        syncOptions: [
          'CreateNamespace=false',
          'RespectIgnoreDifferences=true',
        ],
      },
    },
  } as Application
}
