import { createProject } from '../src/models/project-queries.js'
import app from '../src/app.js'

import projects from 'shared/dev-setup/projects.json' assert { type: 'json' }

export default async () => {
  app.log.info('Creating projects...')
  const projectsCreated = projects.map(async project => {
    try {
      await createProject(project)
      app.log.info(`Project '${project.projectName}' created !`)
    } catch (err) {
      app.log.error(err)
    }
  })
  return Promise.all(projectsCreated)
}
