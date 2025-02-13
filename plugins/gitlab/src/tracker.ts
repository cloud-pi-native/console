import { hostFunctions } from '@cpn-console/hooks'
import { getApi, getGroupRootId } from './utils.js'
import infos from './infos.js'
import type { GroupSchema } from '@gitbeaker/core'

export async function tracker() {
  try {
    const groupRootId = await getGroupRootId(false)
    const api = getApi()
    if (!groupRootId) {
      return hostFunctions.updateReport(infos.name, 'Warning Group root does not exist')
    }
    const gitlabGroups = await api.Groups.allSubgroups(groupRootId)
    const projects: Record<string, GroupSchema> = {}

    for (const gitlabGroup of gitlabGroups) {
      if (['infra', 'catalog'].includes(gitlabGroup.path)) continue
      projects[gitlabGroup.path] = gitlabGroup
    }

    const projectsStatus = await hostFunctions.getProjectsStatus(Object.values(projects).map(({ path }) => path))
    for (const project of projectsStatus) {
      if (['created', 'initializing', 'failed', 'warning'].includes(project.status)) {
        delete projects[project.slug]
      }
    }
    const toDelete = Object.values(projects).map(project => ({
      id: project.id,
      full_path: project.full_path,
      web_url: project.web_url,
    }))
    await hostFunctions.updateReport(
      infos.name,
      JSON.stringify({
        toDelete,
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
