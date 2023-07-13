import { argoNamespace } from '@/utils/env.js'
import { createApplicationProject } from './app-project.js'
import { customK8sApi, patchOptions } from './init.js'

// idempotent script implemented after 3.4.1 version to merge appProject
export const migrateAppProject = async ({ appProjectName, destNamespace, roGroup, rwGroup }: { appProjectName: string, destNamespace: string, roGroup: string, rwGroup: string }) => {
  const appProjectListByName = await customK8sApi.listNamespacedCustomObject('argoproj.io', 'v1alpha1', argoNamespace, 'appprojects', undefined, undefined, undefined, `metadata.name=${appProjectName}`)
  // @ts-ignore
  if (appProjectListByName.body.items.length) return
  const oldAppProjects = await findOldAppProjects(destNamespace)
  const sourceRepos = oldAppProjects.map(oldAppProject => ({ url: oldAppProject.spec.sourceRepos })).flat()
  await createApplicationProject({ appProjectName, roGroup, rwGroup, repositories: sourceRepos })
  await patchApplications({ appProjectName, destNamespace })
}

export const findOldAppProjects = async (destNamespace) => {
  const appProjectList = await customK8sApi.listNamespacedCustomObject('argoproj.io', 'v1alpha1', argoNamespace, 'appprojects')
  // @ts-ignore
  return appProjectList.body.items.filter(item => item.spec.destinations.filter(destination => destination.namespace === destNamespace).length)
}

export const patchApplications = async ({ appProjectName, destNamespace }) => {
  const applicationListAll = await customK8sApi.listNamespacedCustomObject('argoproj.io', 'v1alpha1', argoNamespace, 'applications')
  // @ts-ignore
  const applicationList = applicationListAll.body.items.filter(item => item.spec.destination.namespace === destNamespace && item.spec.project !== appProjectName)
  for (const app of applicationList) {
    await customK8sApi.deleteNamespacedCustomObject('argoproj.io', 'v1alpha1', argoNamespace, 'appprojects', app.spec.project)
    await customK8sApi.patchNamespacedCustomObject('argoproj.io', 'v1alpha1', argoNamespace, 'applications', app.metadata.name, [{ op: 'replace', path: '/spec/project', value: appProjectName }], undefined, undefined, undefined, patchOptions)
  }
}
