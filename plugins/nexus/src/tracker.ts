import { hostFunctions } from '@cpn-console/hooks'
import { getAxiosInstance } from './utils.js'
import infos from './infos.js'

interface Repository {
  name: string
  format: string
  type: string
  url: string
  attributes?: {
    [x: string]: unknown
  }
}

export async function tracker() {
  try {
    const axiosinstance = getAxiosInstance()
    const repositoriesRes = await axiosinstance({
      method: 'GET',
      url: '/repositories',
    }) as { data: Repository[] }
    const repositories = repositoriesRes.data
    const projectRepos: Record<string, Repository[]> = {}
    for (const repository of repositories) {
      let projectslug = ''
      const validEnds = [
        '-npm',
        '-npm-group',
        '-repository-group',
        '-repository-release',
        '-repository-snapshot',
      ]
      for (const end of validEnds) {
        if (repository.name.endsWith(end)) {
          projectslug = repository.name.slice(0, -end.length)
        }
      }
      if (projectslug) {
        delete repository.attributes
        if (projectslug in projectRepos) {
          projectRepos[projectslug].push(repository)
        } else {
          projectRepos[projectslug] = [repository]
        }
      }
    }
    const projectsStatus = await hostFunctions.getProjectsStatus(Object.keys(projectRepos))
    for (const project of projectsStatus) {
      if (['created', 'initializing', 'failed', 'warning'].includes(project.status)) {
        delete projectRepos[project.slug]
      }
    }
    await hostFunctions.updateReport(
      infos.name,
      JSON.stringify({ toDelete: Object.values(projectRepos).flat() }),
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
