import { ArgoDestination, removeRepoFromApplicationProject } from './app-project.js'
import { getConfig, getCustomK8sApi } from './utils.js'

type AppProject = any
type Application = any

export const createApplication = async (
  { applicationName, destination, repo, appProject }:
  { applicationName: string, destination: ArgoDestination, repo: any, appProject: AppProject & { metadata: { name: string }}},
) => {
  const customK8sApi = getCustomK8sApi()

  const applications = await customK8sApi.listNamespacedCustomObject('argoproj.io', 'v1alpha1', getConfig().namespace, 'applications', undefined, undefined, undefined, `metadata.name=${applicationName}`)
  // @ts-ignore Les types de la lib ne semblent pas corrects
  const application = applications.body.items.find(app => app.metadata.name === applicationName)
  if (!application) {
    const result = await customK8sApi.createNamespacedCustomObject('argoproj.io', 'v1alpha1', getConfig().namespace, 'applications', getApplicationObject({
      name: applicationName,
      destination,
      repoURL: repo.url,
      appProjectName: appProject.metadata.name,
    }))
    return result.body
  }
  return application
}

export const deleteApplication = async ({ applicationName, repoUrl }: { applicationName: string, repoUrl: string }) => {
  const customK8sApi = getCustomK8sApi()
  const applications = await customK8sApi.listNamespacedCustomObject('argoproj.io', 'v1alpha1', getConfig().namespace, 'applications', undefined, undefined, undefined, `metadata.name=${applicationName}`)
  // @ts-ignore Les types de la lib ne semblent pas corrects
  const application = applications.body.items.find(app => app.metadata.name === applicationName)
  if (application) {
    const appProjectName = application.spec.project
    await removeRepoFromApplicationProject({ appProjectName, repoUrl })
    await customK8sApi.deleteNamespacedCustomObject('argoproj.io', 'v1alpha1', getConfig().namespace, 'applications', applicationName)
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
      namespace: getConfig().namespace,
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
