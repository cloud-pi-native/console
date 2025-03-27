import { hostFunctions } from '@cpn-console/hooks'
import infos from './infos.js'
import { getAllGroups } from './group.js'
import { getkcClient } from './client.js'

export async function tracker() {
  try {
    const kcClient = await getkcClient()

    const keycloakGroups = await getAllGroups(kcClient, 0, [])
    const config = await hostFunctions.getPluginConfig(infos.name)
    const ignoresFromconfig = config.registry?.groupsToIgnore.split(',').map((p: string) => p.trim())
    const groupsToIgnore = ['/admin', '/ArgoCDAdmins'].concat(ignoresFromconfig)

    const projects = {} as Record<string, { path: string, id: string }>

    for (const keycloakGroup of keycloakGroups) {
      const path = keycloakGroup.path as string
      const id = keycloakGroup.id as string
      const name = keycloakGroup.name as string
      if (groupsToIgnore.includes(path)) {
        continue
      }
      projects[name] = { path, id }
    }

    const projectsStatus = await hostFunctions.getProjectsStatus(Object.keys(projects))
    for (const project of projectsStatus) {
      delete projects[project.slug]
    }

    await hostFunctions.updateReport(
      infos.name,
      JSON.stringify({
        projects,
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
