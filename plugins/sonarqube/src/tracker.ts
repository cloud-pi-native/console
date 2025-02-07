import { hostFunctions } from '@cpn-console/hooks'
import infos from './infos.js'
import { getAxiosInstance } from './tech.js'
import type { SonarProjectResult } from './project.js'
import { splitProjectKey } from './project.js'
import { ItemCollector } from '@cpn-console/shared'

export async function tracker() {
  try {
    const axiosInstance = getAxiosInstance()
    const orphanResources = [] as string[]
    const projects = new ItemCollector<string>()

    let page = 0
    const pageSize = 100
    let total = 0

    do {
      page++
      const similarProjects = await axiosInstance.get('projects/search', {
        params: {
          p: page,
          ps: pageSize,
        },
      }) as {
        data: {
          components: SonarProjectResult[]
          paging: { total: number }
        }
      }
      total = similarProjects.data.paging.total
      for (const project of similarProjects.data.components) {
        const determinedProject = splitProjectKey(project)
        if (!determinedProject.slug) {
          orphanResources.push(determinedProject.sonarProject.key)
          continue
        }
        projects.add(determinedProject.slug, determinedProject.sonarProject.key)
      }
    } while (page * pageSize < total)

    const projectsStatus = await hostFunctions.getProjectsStatus(projects.keys())
    for (const project of projectsStatus) {
      if (['created', 'initializing', 'failed', 'warning'].includes(project.status)) {
        projects.delete(project.slug)
      }
    }
    await hostFunctions.updateReport(
      infos.name,
      JSON.stringify({ toDelete: projects.collector, orphanResources }),
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
