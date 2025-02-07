import { hostFunctions } from '@cpn-console/hooks'
import infos from './infos.js'
import { ItemCollector } from '@cpn-console/shared'
import { createCoreV1Api } from './api.js'

const consoleSelector = 'app.kubernetes.io/managed-by=dso-console'

async function tracker() {
  try {
    const projectNamespaces = new ItemCollector<any>()

    const clusters = await hostFunctions.getClusters()

    const orphanResources = { namespaces: [] as Array<{
      cluster: string
      zone: string
      name: string
      labels?: Record<string, string>
    }> }
    for (const cluster of clusters) {
      const clusterApi = createCoreV1Api(cluster)
      if (!clusterApi) continue
      const clusterNamespaces = await clusterApi.listNamespace(undefined, undefined, undefined, undefined, consoleSelector)
      for (const namespace of clusterNamespaces.body.items) {
        const identifier = namespace.metadata?.labels?.['dso/project.slug'] ?? namespace.metadata?.labels?.['dso/project.id']
        const name = namespace.metadata?.name as string
        if (!identifier) {
          orphanResources.namespaces.push({
            cluster: cluster.label,
            name,
            zone: cluster.zone.slug,
            labels: namespace.metadata?.labels,
          })
          continue
        }
        projectNamespaces.add(identifier, name)
      }
    }
    const projectsStatus = await hostFunctions.getProjectsStatus(projectNamespaces.keys())
    for (const project of projectsStatus) {
      if (['created', 'initializing', 'failed', 'warning'].includes(project.status)) {
        projectNamespaces.delete(project.slug)
        projectNamespaces.delete(project.id)
      }
    }
    await hostFunctions.updateReport(
      infos.name,
      JSON.stringify({
        toDelete: {
          projectNamespaces,
          orphanResources,
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
