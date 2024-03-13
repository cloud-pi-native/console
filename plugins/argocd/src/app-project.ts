import { PatchUtils } from '@kubernetes/client-node'
import { getConfig, getCustomK8sApi } from './utils.js'

const patchOptions = { headers: { 'Content-type': PatchUtils.PATCH_FORMAT_JSON_PATCH } }

export type ArgoDestination = {
  namespace?: string
  name?: string
  server?: string
}

type AppProject = any

export const getAppProject = async (appProjectName: string): Promise<AppProject | void> => {
  const customK8sApi = getCustomK8sApi()
  const appProjectList = await customK8sApi.listNamespacedCustomObject('argoproj.io', 'v1alpha1', getConfig().namespace, 'appprojects', undefined, undefined, undefined, `metadata.name=${appProjectName}`) as { body: { items: AppProject[] } }
  return appProjectList.body.items.find(appProject => appProject.metadata.name === appProjectName)
}

export const createApplicationProject = async (
  { appProjectName, repositories, roGroup, rwGroup, destination }:
  { appProjectName: string, repositories: any[], roGroup: string, rwGroup: string, destination: ArgoDestination },
): Promise<AppProject> => {
  const customK8sApi = getCustomK8sApi()
  const appProject = await getAppProject(appProjectName)
  const sourceRepos = repositories.map(repo => repo.url).flat()
  const appProjectObject = getAppProjectObject({
    name: appProjectName,
    rwGroup,
    roGroup,
    sourceRepos,
    destination,
  })

  if (appProject) {
    await customK8sApi.replaceNamespacedCustomObject('argoproj.io', 'v1alpha1', getConfig().namespace, 'appprojects', appProjectName, appProjectObject)
  } else {
    await customK8sApi.createNamespacedCustomObject('argoproj.io', 'v1alpha1', getConfig().namespace, 'appprojects', appProjectObject)
  }
  return appProjectObject
}

export const deleteApplicationProject = async ({ appProjectName }: { appProjectName: string }) => {
  const appProject = await getAppProject(appProjectName)
  if (appProject) {
    const customK8sApi = getCustomK8sApi()
    await customK8sApi.deleteNamespacedCustomObject('argoproj.io', 'v1alpha1', getConfig().namespace, 'appprojects', appProjectName)
  }
}

export const addRepoToApplicationProject = async ({ appProjectName, repoUrl }: { appProjectName: string, repoUrl: string }): Promise<AppProject> => {
  const appProject = await getAppProject(appProjectName)
  if (appProject) {
    const sourceRepos = appProject.spec.sourceRepos ?? [repoUrl]
    if (!sourceRepos.includes(repoUrl)) {
      sourceRepos.push(repoUrl)
      const newSourceRepos = sourceRepos.flat()
      const customK8sApi = getCustomK8sApi()
      await customK8sApi.patchNamespacedCustomObject('argoproj.io', 'v1alpha1', getConfig().namespace, 'appprojects', appProjectName, [{ op: 'replace', path: '/spec/sourceRepos', value: newSourceRepos }], undefined, undefined, undefined, patchOptions)
    }
    return appProject
  }
  throw new Error(`appproject ${appProjectName} not found`)
}

export const removeRepoFromApplicationProject = async ({ appProjectName, repoUrl }: { appProjectName: string, repoUrl: string }) => {
  const appProject = await getAppProject(appProjectName)
  if (appProject) {
    const sourceRepos: string[] = appProject.spec.sourceRepos
    const newSourceRepos = sourceRepos ? sourceRepos.filter(url => url !== repoUrl) : []
    const customK8sApi = getCustomK8sApi()

    await customK8sApi.patchNamespacedCustomObject('argoproj.io', 'v1alpha1', getConfig().namespace, 'appprojects', appProjectName, [{ op: 'replace', path: '/spec/sourceRepos', value: newSourceRepos }], undefined, undefined, undefined, patchOptions)
  }
}

const getAppProjectObject = (
  { name, sourceRepos, roGroup, rwGroup, destination }:
  { name: string, sourceRepos: string[], roGroup: string, rwGroup: string, destination: ArgoDestination },
) => {
  return {
    apiVersion: 'argoproj.io/v1alpha1',
    kind: 'AppProject',
    metadata: {
      name,
      namespace: getConfig().namespace,
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
