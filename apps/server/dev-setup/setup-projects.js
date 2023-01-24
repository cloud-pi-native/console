import { _projectInitializing, projectCreated, projectFailed, projectArchiving } from '../src/models/queries/project-queries.js'
import { environmentInitializing, environmentCreated, environmentFailed } from '../src/models/queries/environment-queries.js'
import { setPermission } from '../src/models/queries/permission-queries.js'
import { repositoryInitializing, repositoryCreated, repositoryFailed } from '../src/models/queries/repository-queries.js'
import app from '../src/app.js'
import { projects } from 'shared/dev-setup/projects.js'
import { getUserById } from '../src/models/queries/user-queries.js'

export default async () => {
  // app.log.info('Clear projects...')
  // await _deleteAllProjects()

  app.log.info('Creating projects...')
  const projectsCreated = projects.map(async project => {
    try {
      // Create project
      const createdProject = await _projectInitializing(project)
      const user = await getUserById(project.ownerId)
      await user.addProject(createdProject, { through: { role: 'owner' } })
      if (project.status === 'created') {
        await projectCreated(createdProject.dataValues.id)
      } else if (createdProject.status === 'archived') {
        await projectArchiving(createdProject.dataValues.id)
      } else {
        await projectFailed(createdProject.dataValues.id)
      }

      project.environments.forEach(async environment => {
        // Create environments
        const createdEnv = await environmentInitializing({
          name: environment.name,
          projectId: createdProject.dataValues.id,
        })
        if (environment.status === 'created') {
          await environmentCreated(createdEnv.dataValues.id)
        } else {
          await environmentFailed(createdEnv.dataValues.id)
        }

        // Create permissions
        environment.permissions.forEach(async permission => {
          await setPermission({
            userId: permission.userId,
            envId: createdEnv.id,
            level: permission.level,
          })
        })
      })

      // Create repositories
      project.repositories.forEach(async repository => {
        const createdRepository = await repositoryInitializing({
          projectId: createdProject.dataValues.id,
          internalRepoName: repository.internalRepoName,
          externalRepoUrl: repository.externalRepoUrl,
          isPrivate: repository.isPrivate,
          externalUserName: repository.externalUserName,
          externalToken: repository.externalToken,
          isInfra: repository.isInfra,
        })
        if (repository.status === 'created') {
          await repositoryCreated(createdRepository.dataValues.id)
        } else {
          await repositoryFailed(createdRepository.dataValues.id)
        }
      })

      app.log.info(`Project '${project.organization} - ${project.name}' created !`)
    } catch (err) {
      app.log.error(err)
    }
  })
  return Promise.all(projectsCreated)
}
