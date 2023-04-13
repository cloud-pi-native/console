import { argoNamespace } from '../../../utils/env.js'
import { customK8sApi } from './init.js'

export const createApplication = async ({ applicationName, namespace, repo, appProjectName }) => {
  const applications = await customK8sApi.listNamespacedCustomObject('argoproj.io', 'v1alpha1', argoNamespace, 'applications', undefined, undefined, undefined, `metadata.name=${applicationName}`)
  const application = applications.body.items.find(app => app.metadata.name === applicationName)
  if (!application) {
    console.log('CreateApplication')
    const result = await customK8sApi.createNamespacedCustomObject('argoproj.io', 'v1alpha1', argoNamespace, 'applications', getApplicationObject({
      name: applicationName,
      destNamespace: namespace,
      repoURL: repo.url,
      appProjectName,
    }))
    return result.body
  }
  return application
}

export const deleteApplication = async (applicationName) => {
  const applications = await customK8sApi.listNamespacedCustomObject('argoproj.io', 'v1alpha1', argoNamespace, 'applications', undefined, undefined, undefined, `metadata.name=${applicationName}`)
  const application = applications.body.items.find(app => app.metadata.name === applicationName)
  if (application) {
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
        path: 'base',
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
  }
}
