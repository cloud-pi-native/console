import { _initializeProject, updateProjectCreated, updateProjectFailed, archiveProject, addUserToProject } from '../../models/queries/project-queries.js'
import { initializeEnvironment, updateEnvironmentCreated, updateEnvironmentFailed } from '../../models/queries/environment-queries.js'
import { setPermission } from '../../models/queries/permission-queries.js'
import { getOrganizationByName } from '../../models/queries/organization-queries.js'
import { initializeRepository, updateRepositoryCreated, updateRepositoryFailed } from '../../models/queries/repository-queries.js'
import app from '../../app.js'
import { getUserById } from '../../models/queries/user-queries.js'

export default async (projects) => {
  app.log.info('Creating projects...')
  const projectsCreated = projects.map(async project => {
    try {
      // Create project
      const dbOrganization = await getOrganizationByName(project.organization)
      project.organization = dbOrganization.id
      const createdProject = await _initializeProject(project)
      if (project.status === 'created') {
        await updateProjectCreated(createdProject.dataValues.id)
      } else if (createdProject.status === 'archived') {
        await archiveProject(createdProject.dataValues.id)
      } else {
        await updateProjectFailed(createdProject.dataValues.id)
      }

      // Create users
      project.users.forEach(async user => {
        const dbUser = await getUserById(user.id)
        await addUserToProject({ project: createdProject, user: dbUser, role: user.role })
      })

      project.environments.forEach(async environment => {
        // Create environments
        const createdEnv = await initializeEnvironment({
          name: environment.name,
          projectId: createdProject.dataValues.id,
        })
        if (environment.status === 'created') {
          await updateEnvironmentCreated(createdEnv.dataValues.id)
        } else {
          await updateEnvironmentFailed(createdEnv.dataValues.id)
        }

        // Create permissions
        environment.permissions.forEach(async permission => {
          await setPermission({
            userId: permission.userId,
            environmentId: createdEnv.id,
            level: permission.level,
          })
        })
      })

      // Create repositories
      project.repositories.forEach(async repository => {
        const createdRepository = await initializeRepository({
          projectId: createdProject.dataValues.id,
          internalRepoName: repository.internalRepoName,
          externalRepoUrl: repository.externalRepoUrl,
          isPrivate: repository.isPrivate,
          externalUserName: repository.externalUserName,
          externalToken: repository.externalToken,
          isInfra: repository.isInfra,
        })
        if (repository.status === 'created') {
          await updateRepositoryCreated(createdRepository.dataValues.id)
        } else {
          await updateRepositoryFailed(createdRepository.dataValues.id)
        }
      })

      app.log.info(`Project '${project.name}' created !`)
    } catch (err) {
      app.log.error(err)
    }
  })
  return Promise.all(projectsCreated)
}
