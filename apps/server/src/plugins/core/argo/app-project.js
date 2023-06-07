import { argoNamespace } from '../../../utils/env.js'
import { customK8sApi, patchOptions } from './init.js'
import { findOldAppProjects } from './migrate.js'

export const createApplicationProject = async ({ appProjectName, namespace, repositories, roGroup, rwGroup }) => {
  const appprojects = await customK8sApi.listNamespacedCustomObject('argoproj.io', 'v1alpha1', argoNamespace, 'appprojects', undefined, undefined, undefined, `metadata.name=${appProjectName}`)
  const appProject = appprojects.body.items.find(appp => appp.metadata.name === appProjectName)

  const sourceRepos = repositories.map(repo => repo.url).flat()
  const appProjectObject = getAppProjectObject({
    name: appProjectName,
    destNamespace: namespace,
    rwGroup,
    roGroup,
    sourceRepos,
  })

  if (!appProject) {
    await customK8sApi.createNamespacedCustomObject('argoproj.io', 'v1alpha1', argoNamespace, 'appprojects', appProjectObject)
    return
  }
  await customK8sApi.replaceClusterCustomObject('argoproj.io', 'v1alpha1', 'appprojects', appProjectName, appProjectObject)
}

export const deleteApplicationProject = async ({ appProjectName, destNamespace }) => {
  const appprojects = await findOldAppProjects(destNamespace) // Support Old appproject method
  if (appprojects.length) { // Support Old appproject method
    for (const oldAppProject of appprojects) {
      await customK8sApi.deleteNamespacedCustomObject('argoproj.io', 'v1alpha1', argoNamespace, 'appprojects', oldAppProject.metadata.name)
    }
  } else if (appprojects?.metadata?.name) {
    await customK8sApi.deleteNamespacedCustomObject('argoproj.io', 'v1alpha1', argoNamespace, 'appprojects', appprojects.metadata.name)
  }
}

export const addRepoToApplicationProject = async ({ appProjectName, repoUrl }) => {
  const appProjectList = await customK8sApi.listNamespacedCustomObject('argoproj.io', 'v1alpha1', argoNamespace, 'appprojects', undefined, undefined, undefined, `metadata.name=${appProjectName}`)
  const appProject = appProjectList.body.items.find(appProject => appProject.metadata.name === appProjectName)
  if (appProjectName) {
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
  const appProjectList = await customK8sApi.listNamespacedCustomObject('argoproj.io', 'v1alpha1', argoNamespace, 'appprojects', undefined, undefined, undefined, `metadata.name=${appProjectName}`)
  const appProject = appProjectList.body.items.find(appProject => appProject.metadata.name === appProjectName)
  if (appProject) {
    const sourceRepos = appProject.spec.sourceRepos
    const newSourceRepos = sourceRepos.filter(url => url !== repoUrl)

    await customK8sApi.patchNamespacedCustomObject('argoproj.io', 'v1alpha1', argoNamespace, 'appprojects', appProjectName, [{ op: 'replace', path: '/spec/sourceRepos', value: newSourceRepos }], undefined, undefined, undefined, patchOptions)
  }
}

const getAppProjectObject = ({ name, destNamespace, sourceRepos, roGroup, rwGroup }) => {
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
          policies: [
            `p, proj:${name}:rw-group, applications, *, ${name}/*, allow`,
            `p, proj:${name}:rw-group, applications, delete, ${name}/*, deny`,
            `p, proj:${name}:rw-group, applications, create, ${name}/*, deny`,
          ],
        },
      ],
      sourceRepos,
    },
  }
}
