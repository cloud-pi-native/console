import { StepCall } from '@/plugins/hooks/hook.js'
import { argoNamespace, customK8sApi, k8sApi } from './init.js'
import { AppProject, Application } from '@kubernetes-models/argo-cd/argoproj.io/v1alpha1/index.js'

export const purgeAll: StepCall<object> = async () => {
  const allAppProjects = await customK8sApi.listNamespacedCustomObject('argoproj.io', 'v1alpha1', argoNamespace, 'appprojects') as { body: { items: AppProject[] } }
  const allApplications = await customK8sApi.listNamespacedCustomObject('argoproj.io', 'v1alpha1', argoNamespace, 'applications') as { body: { items: Application[] } }
  const projectNames = allAppProjects.body.items.filter(project => project.metadata.name.match(/.*(dev|staging|integration|prod)-project/)).map(project => project.metadata.name)
  const applicationNames = allApplications.body.items
    .filter(app => projectNames.includes(app.spec.project))
    .map(app => app.metadata.name)
  const allClustersSecrets = await k8sApi.listNamespacedSecret(argoNamespace, undefined, undefined, undefined, undefined, 'argocd.argoproj.io/secret-type=cluster')
  const secretNames = allClustersSecrets.body.items.map(secret => secret.metadata.name)

  await Promise.all(
    [
      ...projectNames.map(name => customK8sApi.deleteNamespacedCustomObject('argoproj.io', 'v1alpha1', argoNamespace, 'appprojects', name)),
      ...applicationNames.map(name => customK8sApi.deleteNamespacedCustomObject('argoproj.io', 'v1alpha1', argoNamespace, 'applications', name)),
      ...secretNames.map(name => k8sApi.deleteNamespacedSecret(name, argoNamespace)),
    ],
  )

  return {
    status: {
      result: 'OK',
      message: 'ArgoCD namespace has been purged',
    },
  }
}
