import { projectInitializing } from '../src/models/queries/project-queries.js'
import app from '../src/app.js'
import { projects } from 'shared/dev-setup/projects.js'

export default async () => {
  // app.log.info('Clear projects...')
  // await _deleteAllProjects()

  app.log.info('Creating projects...')
  const projectsCreated = projects.map(async project => {
    try {
      await projectInitializing(project)
      app.log.info(`Project '${project.projectName}' created !`)
    } catch (err) {
      app.log.error(err)
    }
  })
  return Promise.all(projectsCreated)
}
