import type { AppProject } from '@kubernetes-models/argo-cd/argoproj.io/v1alpha1'
import { argoNamespace, customK8sApi, patchOptions } from './init.js'

export const getAppProject = async (appProjectName: string): Promise<AppProject | void> => {
  const appProjectList = await customK8sApi.listNamespacedCustomObject('argoproj.io', 'v1alpha1', argoNamespace, 'appprojects', undefined, undefined, undefined, `metadata.name=${appProjectName}`) as { body: { items: AppProject[] } }
  return appProjectList.body.items.find(appProject => appProject.metadata.name === appProjectName)
}

export const createApplicationProject = async ({ appProjectName, repositories, roGroup, rwGroup }) => {
  const appProject = await getAppProject(appProjectName)
  const sourceRepos = repositories.map(repo => repo.url).flat()
  const appProjectObject = getAppProjectObject({
    name: appProjectName,
    rwGroup,
    roGroup,
    sourceRepos,
    ...appProject && { resourceVersion: appProject?.metadata?.resourceVersion },
    ...appProject && { destinations: appProject?.spec?.destinations },
  })

  if (!appProject) {
    delete appProjectObject.metadata.resourceVersion
    await customK8sApi.createNamespacedCustomObject('argoproj.io', 'v1alpha1', argoNamespace, 'appprojects', appProjectObject)
    return
  }
  await customK8sApi.replaceNamespacedCustomObject('argoproj.io', 'v1alpha1', argoNamespace, 'appprojects', appProjectName, appProjectObject)
}

export const deleteApplicationProject = async ({ appProjectName }) => {
  const appProject = await getAppProject(appProjectName)
  if (appProject) {
    await customK8sApi.deleteNamespacedCustomObject('argoproj.io', 'v1alpha1', argoNamespace, 'appprojects', appProjectName)
  }
}

export const addRepoToApplicationProject = async ({ appProjectName, repoUrl }) => {
  const appProject = await getAppProject(appProjectName)
  if (appProject) {
    const sourceRepos = appProject.spec.sourceRepos
    if (!sourceRepos.includes(repoUrl)) {
      sourceRepos.push(repoUrl)
      const newSourceRepos = sourceRepos.flat()
      await customK8sApi.patchNamespacedCustomObject('argoproj.io', 'v1alpha1', argoNamespace, 'appprojects', appProjectName, [{ op: 'replace', path: '/spec/sourceRepos', value: newSourceRepos }], undefined, undefined, undefined, patchOptions)
    }
    return
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

export const addDestinationToApplicationProject = async (appProjectName: string, newDestination: { name: string, namespace: string, server: string }) => {
  const appProject = await getAppProject(appProjectName)
  if (appProject) {
    const destinations = appProject.spec.destinations
    if (!destinations.some(destination => destination.name === newDestination.name)) {
      destinations.push(newDestination)
      await customK8sApi.patchNamespacedCustomObject('argoproj.io', 'v1alpha1', argoNamespace, 'appprojects', appProjectName, [{ op: 'replace', path: '/spec/destinations', value: destinations }], undefined, undefined, undefined, patchOptions)
    }
    return
  }
  throw new Error(`appproject ${appProjectName} not found`)
}

export const removeDestinationFromApplicationProject = async (appProjectName: string, name: string) => {
  const appProject = await getAppProject(appProjectName)

  if (appProject) {
    const destinations = appProject.spec.destinations
    const newDestinations = destinations.filter(destination => destination.name !== name)
    await customK8sApi.patchNamespacedCustomObject('argoproj.io', 'v1alpha1', argoNamespace, 'appprojects', appProjectName, [{ op: 'replace', path: '/spec/destinations', value: newDestinations }], undefined, undefined, undefined, patchOptions)
    return
  }
  throw new Error(`appproject ${appProjectName} not found`)
}

const getAppProjectObject = ({ name, sourceRepos, roGroup, rwGroup, resourceVersion, destinations }) => {
  return {
    apiVersion: 'argoproj.io/v1alpha1',
    kind: 'AppProject',
    metadata: {
      name,
      namespace: argoNamespace,
      ...(resourceVersion && { resourceVersion }),
    },
    spec: {
      destinations: destinations || [],
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
