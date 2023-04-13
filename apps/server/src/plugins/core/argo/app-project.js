import { argoNamespace } from '../../../utils/env.js'
import { customK8sApi } from './init.js'

export const createApplicationProject = async ({ appProjectName, namespace, repo, roGroup, rwGroup }) => {
  const appprojects = await customK8sApi.listNamespacedCustomObject('argoproj.io', 'v1alpha1', argoNamespace, 'appprojects', undefined, undefined, undefined, `metadata.name=${appProjectName}`)
  const appproject = appprojects.body.items.find(appp => appp.metadata.name === appProjectName)
  if (!appproject) {
    console.log('CreateAppProject')
    await customK8sApi.createNamespacedCustomObject('argoproj.io', 'v1alpha1', argoNamespace, 'appprojects', getAppProjectObject({
      name: appProjectName,
      destNamespace: namespace,
      rwGroup,
      roGroup,
      repoURL: repo.url,
    }))
    return appProjectName
  }
  return appproject
}

export const deleteApplicationProject = async (appProjectName) => {
  const appprojects = await customK8sApi.listNamespacedCustomObject('argoproj.io', 'v1alpha1', argoNamespace, 'appprojects', undefined, undefined, undefined, `metadata.name=${appProjectName}`)
  const appproject = appprojects.body.items.find(appp => appp.metadata.name === appProjectName)
  if (appproject) {
    await customK8sApi.deleteNamespacedCustomObject('argoproj.io', 'v1alpha1', argoNamespace, 'appprojects', appProjectName)
  }
}

const getAppProjectObject = ({ name, destNamespace, repoURL, roGroup, rwGroup }) => {
  return {
    apiVersion: 'argoproj.io/v1alpha1',
    kind: 'AppProject',
    metadata: {
      name,
      namespace: argoNamespace,
    },
    spec: {
      destinations: [{
        name: '*',
        namespace: destNamespace,
        server: '*',
      }],
      namespaceResourceWhitelist: [{
        group: '*',
        kind: '*',
      }],
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
          policies: [`p, proj:${name}:rw-group, applications, *, ${name}/*, allow`],
        },
      ],
      sourceRepos: [repoURL],
    },
  }
}
