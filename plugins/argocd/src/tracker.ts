import type { ListMinimumResources } from '@cpn-console/hooks'
import { hostFunctions } from '@cpn-console/hooks'
import infos from './infos.js'
import { getConfig, getCustomK8sApi } from './utils.js'
import { ItemCollector } from '@cpn-console/shared'

const consoleSelector = 'app.kubernetes.io/managed-by=dso-console'
export async function tracker() {
  try {
    const customK8sApi = getCustomK8sApi()
    const applicationsFound = await customK8sApi.listNamespacedCustomObject('argoproj.io', 'v1alpha1', getConfig().namespace, 'applications', undefined, undefined, undefined, undefined, consoleSelector) as ListMinimumResources
    const appProjectsFound = await customK8sApi.listNamespacedCustomObject('argoproj.io', 'v1alpha1', getConfig().namespace, 'appprojects', undefined, undefined, undefined, undefined, consoleSelector) as ListMinimumResources

    const applications = new ItemCollector<any>()
    const appProjects = new ItemCollector<any>()

    const orphanResources = {
      applications: [] as string[],
      appProjects: [] as string[],
    }
    for (const application of applicationsFound.body.items) {
      const identifier = application.metadata?.labels?.['dso/project.slug'] ?? application.metadata?.labels?.['dso/project.id']
      if (!identifier) {
        orphanResources.applications.push(application.metadata.name)
        continue
      }
      applications.add(identifier, application.metadata.name)
    }

    for (const application of appProjectsFound.body.items) {
      const identifier = application.metadata?.labels?.['dso/project.slug'] ?? application.metadata?.labels?.['dso/project.id']
      if (!identifier) {
        orphanResources.appProjects.push(application.metadata.name)
        continue
      }
      appProjects.add(identifier, application.metadata.name)
    }
    const projectsStatus = await hostFunctions.getProjectsStatus(applications.keys().concat(appProjects.keys()))
    for (const project of projectsStatus) {
      if (['created', 'initializing', 'failed', 'warning'].includes(project.status)) {
        applications.delete(project.slug)
        appProjects.delete(project.slug)
        applications.delete(project.id)
        appProjects.delete(project.id)
      }
    }

    await hostFunctions.updateReport(
      infos.name,
      JSON.stringify({
        orphanResources,
        toDelete: {
          appProjects: appProjects.collector,
          applications: applications.collector,
        },
      }),
    )
  } catch (error) {
    console.log(error)
  }
}

export function startTracker() {
  tracker()
  setInterval(() => {
    tracker()
  }, 1000 * 60 * 5)
}
