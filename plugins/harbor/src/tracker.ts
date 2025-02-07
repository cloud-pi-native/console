import { hostFunctions } from '@cpn-console/hooks'
import infos from './infos.js'
import { getApi } from './utils.js'
import type { Project } from './api/Api.js'

const pageSize = 100
async function listAllProjects(initialValue: Array<Project>, page: number) {
  const api = getApi()
  const projects = await api.projects.listProjects({ page_size: pageSize, with_detail: false, page })
  const resultLeft = Number(projects.headers['x-total-count']) - (pageSize * (page + 1))
  initialValue.push(...projects.data)
  if (resultLeft > 0) {
    await listAllProjects(initialValue, page + 1)
  }
  return initialValue
}

export async function tracker() {
  try {
    const harborProjects = await listAllProjects([], 0)
    const config = await hostFunctions.getPluginConfig(infos.name)
    const ignoresFromconfig = config.registry?.projectsToIgnore.split(',').map((p: string) => p.trim())
    const projectToIgnore = ['library', 'dockerhub'].concat(ignoresFromconfig)

    const projects = {} as Record<string, number>

    for (const harborProject of harborProjects) {
      const projectName = harborProject.name as string
      if (projectToIgnore.includes(projectName)) {
        continue
      }
      projects[projectName] = harborProject.project_id as number
    }

    const projectsStatus = await hostFunctions.getProjectsStatus(Object.keys(projects))
    for (const project of projectsStatus) {
      delete projects[project.slug]
    }

    await hostFunctions.updateReport(
      infos.name,
      JSON.stringify({
        toDelete: projects,
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
