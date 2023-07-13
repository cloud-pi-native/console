import type { Application } from '@kubernetes-models/argo-cd/argoproj.io/v1alpha1'
import { argoNamespace } from '../../../utils/env.js'
import { addRepoToApplicationProject, removeRepoFromApplicationProject } from './app-project.js'
import { customK8sApi } from './init.js'

export const createApplication = async ({ applicationName, namespace, repo, appProjectName }) => {
  const applications = await customK8sApi.listNamespacedCustomObject('argoproj.io', 'v1alpha1', argoNamespace, 'applications', undefined, undefined, undefined, `metadata.name=${applicationName}`)
  // @ts-ignore Les types de la lib ne semblent pas corrects
  const application = applications.body.items.find(app => app.metadata.name === applicationName)
  if (!application) {
    const result = await customK8sApi.createNamespacedCustomObject('argoproj.io', 'v1alpha1', argoNamespace, 'applications', getApplicationObject({
      name: applicationName,
      destNamespace: namespace,
      repoURL: repo.url,
      appProjectName,
    }))
    await addRepoToApplicationProject({ appProjectName, repoUrl: repo.url })
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

const getApplicationObject = ({ name, destNamespace, repoURL, appProjectName }) => {
  return {
    apiVersion: 'argoproj.io/v1alpha1',
    kind: 'Application',
    metadata: {
      name,
      namespace: argoNamespace,
    },
    spec: {
      destination: {
        namespace: destNamespace,
        server: 'https://kubernetes.default.svc',
      },
      project: appProjectName,
      source: {
        path: '.',
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
