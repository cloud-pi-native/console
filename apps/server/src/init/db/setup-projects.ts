import { _initializeProject, updateProjectCreated, updateProjectFailed, archiveProject, addUserToProject } from '../../queries/project-queries.js'
import { initializeEnvironment, updateEnvironmentCreated, updateEnvironmentFailed } from '../../queries/environment-queries.js'
import { setPermission } from '../../queries/permission-queries.js'
import { getOrganizationByName } from '../../queries/organization-queries.js'
import { initializeRepository, updateRepositoryCreated, updateRepositoryFailed } from '../../queries/repository-queries.js'
import app from '../../app.js'
import { getUserById } from '../../queries/user-queries.js'
import { addLogs } from '../../queries/log-queries.js'

export default async (projects) => {
  app.log.info('Creating projects...')
  for (const project of projects) {
    try {
      // Create project
      const dbOrganization = await getOrganizationByName(project.organization)
      project.organization = dbOrganization.id
      const createdProject = await _initializeProject(project)
      if (project.status === 'created') {
        await updateProjectCreated(createdProject.id)
      } else if (createdProject.status === 'archived') {
        await archiveProject(createdProject.id)
      } else {
        await updateProjectFailed(createdProject.id)
      }

      // Create users
      project.users.forEach(async user => {
        const dbUser = await getUserById(user.id)
        await addUserToProject({ project: createdProject, user: dbUser, role: user.role })
      })

      project.environments.forEach(async environment => {
        // Create environments
        const createdEnv = await initializeEnvironment({
          projectOwners: project.users.filter(user => user.role === 'owner'),
          name: environment.name,
          projectId: createdProject.id,
        })
        if (environment.status === 'created') {
          await updateEnvironmentCreated(createdEnv.id)
        } else {
          await updateEnvironmentFailed(createdEnv.id)
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
      project.repositories?.forEach(async repository => {
        const createdRepository = await initializeRepository({
          projectId: createdProject.id,
          internalRepoName: repository.internalRepoName,
          externalRepoUrl: repository.externalRepoUrl,
          isPrivate: repository.isPrivate,
          externalUserName: repository.externalUserName,
          isInfra: repository.isInfra,
        })
        if (repository.status === 'created') {
          await updateRepositoryCreated(createdRepository.id)
        } else {
          await updateRepositoryFailed(createdRepository.id)
        }
      })

      // Create logs
      project.logs?.forEach(async log => {
        await addLogs(log.action, log.data, log.userId)
      })

      app.log.info(`Project '${project.name}' created !`)
    } catch (err) {
      app.log.error(err)
    }
  }
}
