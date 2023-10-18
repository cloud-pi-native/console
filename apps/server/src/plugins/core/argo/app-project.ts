import type { AppProject } from '@kubernetes-models/argo-cd/argoproj.io/v1alpha1'
import { argoNamespace, customK8sApi, patchOptions } from './init.js'

export type ArgoDestination = AppProject['spec']['destinations'][0]

export const getAppProject = async (appProjectName: string): Promise<AppProject | void> => {
  const appProjectList = await customK8sApi.listNamespacedCustomObject('argoproj.io', 'v1alpha1', argoNamespace, 'appprojects', undefined, undefined, undefined, `metadata.name=${appProjectName}`) as { body: { items: AppProject[] } }
  return appProjectList.body.items.find(appProject => appProject.metadata.name === appProjectName)
}

export const createApplicationProject = async (
  { appProjectName, repositories, roGroup, rwGroup, destination }:
  { appProjectName: string, repositories: any[], roGroup: string, rwGroup: string, destination: ArgoDestination },
) => {
  const appProject = await getAppProject(appProjectName)
  const sourceRepos = repositories.map(repo => repo.url).flat()
  const appProjectObject = getAppProjectObject({
    name: appProjectName,
    rwGroup,
    roGroup,
    sourceRepos,
    destination,
  })

  if (!appProject) {
    await customK8sApi.createNamespacedCustomObject('argoproj.io', 'v1alpha1', argoNamespace, 'appprojects', appProjectObject)
    return
  }
  await customK8sApi.replaceNamespacedCustomObject('argoproj.io', 'v1alpha1', argoNamespace, 'appprojects', appProjectName, appProjectObject)
  return appProjectObject
}

export const deleteApplicationProject = async ({ appProjectName }) => {
  const appProject = await getAppProject(appProjectName)
  if (appProject) {
    await customK8sApi.deleteNamespacedCustomObject('argoproj.io', 'v1alpha1', argoNamespace, 'appprojects', appProjectName)
  }
}

export const addRepoToApplicationProject = async ({ appProjectName, repoUrl }): Promise<AppProject> => {
  const appProject = await getAppProject(appProjectName)
  if (appProject) {
    const sourceRepos = appProject.spec.sourceRepos
    if (!sourceRepos.includes(repoUrl)) {
      sourceRepos.push(repoUrl)
      const newSourceRepos = sourceRepos.flat()
      await customK8sApi.patchNamespacedCustomObject('argoproj.io', 'v1alpha1', argoNamespace, 'appprojects', appProjectName, [{ op: 'replace', path: '/spec/sourceRepos', value: newSourceRepos }], undefined, undefined, undefined, patchOptions)
    }
    return appProject
  }
  throw new Error(`appproject ${appProjectName} not found`)
}

export const removeRepoFromApplicationProject = async ({ appProjectName, repoUrl }) => {
  const appProject = await getAppProject(appProjectName)
  if (appProject) {
    const sourceRepos = appProject.spec.sourceRepos
    const newSourceRepos = sourceRepos.filter(url => url !== repoUrl)

    await customK8sApi.patchNamespacedCustomObject('argoproj.io', 'v1alpha1', argoNamespace, 'appprojects', appProjectName, [{ op: 'replace', path: '/spec/sourceRepos', value: newSourceRepos }], undefined, undefined, undefined, patchOptions)
  }
}

const getAppProjectObject = (
  { name, sourceRepos, roGroup, rwGroup, destination }:
  { name: string, sourceRepos, roGroup: string, rwGroup: string, destination: ArgoDestination },
) => {
  return {
    apiVersion: 'argoproj.io/v1alpha1',
    kind: 'AppProject',
    metadata: {
      name,
      namespace: argoNamespace,
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
  } as AppProject
}
