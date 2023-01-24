import { allOrganizations } from 'shared/src/utils/iterables.js'
import setupProjects from './setup-projects.js'
import setupUsers from './setup-users.js'
import { createOrganization } from '../src/models/queries/organization-queries.js'
import { dropTables, synchroniseModels } from '../src/connect.js'
// import { createUser, getUserById } from '../src/models/queries/user-queries.js'
// import { projectInitializing, projectArchiving, projectCreated, projectFailed, projectAddUser, getProject, projectRemoveUser } from '../src/models/queries/project-queries.js'
// import { getEnvironment, environmentInitializing, environmentCreated, environmentFailed } from '../src/models/queries/environment-queries.js'
// import { setPermission } from '../src/models/queries/permission-queries.js'
// import { repositoryCreated, repositoryFailed, repositoryInitializing, repositoryDeleting, updateRepository, deleteRepository } from '../src/models/queries/repository-queries.js'

export const initDb = async () => {
  await dropTables()
  await synchroniseModels()

  for (const org of allOrganizations) {
    await createOrganization(org)
  }

  await setupUsers()
  await setupProjects()
}

// export const initDb = async () => {
//   // Create organizations
//   for (const org of allOrganizations) {
//     await createOrganization(org)
//   }

//   // Create users
//   await createUser({
//     id: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6565',
//     email: 'test@test.com',
//     firstName: 'test',
//     lastName: 'com',
//   })
//   await createUser({
//     id: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6464',
//     email: 'toto@test.com',
//     firstName: 'toto',
//     lastName: 'com',
//   })
//   await getUserById('cb8e5b4b-7b7b-40f5-935f-594f48ae6464')

//   // Initialize projects
//   let projectTest = await projectInitializing({ name: 'test-projet', organization: 'dinum', ownerId: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6565' })
//   const projectToto = await projectInitializing({ name: 'toto-projet', organization: 'dinum', ownerId: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6464' })
//   const projectFailing = await projectInitializing({ name: 'failed-projet', organization: 'dinum', ownerId: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6565' })

//   // Update projects statuses
//   await projectCreated(projectTest.id)
//   await projectCreated(projectToto.id)
//   await projectFailed(projectFailing.id)

//   // Add user to project
//   await projectAddUser({ projectId: projectToto.id, userId: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6565' })

//   // Remove user from a project
//   await projectAddUser({ projectId: projectTest.id, userId: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6464' })
//   projectTest = await getProject({ name: 'test-projet', organization: 'dinum' })
//   await projectRemoveUser({ projectId: projectTest.id, userId: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6464' })
//   projectTest = await getProject({ name: 'test-projet', organization: 'dinum' })

//   // Create environments for a project
//   await environmentInitializing({ name: 'staging', projectId: projectToto.id })
//   await environmentInitializing({ name: 'prod', projectId: projectToto.id })
//   const envStaging = await getEnvironment({ projectId: projectToto.id, name: 'staging' })
//   const envProd = await getEnvironment({ projectId: projectToto.id, name: 'prod' })
//   await environmentCreated(envStaging.id)
//   await environmentFailed(envProd.id)

//   // Set permissions for a user on given environments
//   await setPermission({ userId: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6565', envId: envStaging.id, level: 0 })
//   await setPermission({ userId: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6565', envId: envProd.id, level: 10 })

//   // Create repositories for a project
//   const repo0 = await repositoryInitializing({ projectId: projectToto.id, internalRepoName: 'candilib', externalRepoUrl: 'https://github.com/dnum-mi/candilib', externalUserName: 'test', externalToken: 'token', isInfra: false, isPrivate: true })
//   await repositoryCreated(repo0.id)
//   const repo1 = await repositoryInitializing({ projectId: projectToto.id, internalRepoName: 'psij', externalRepoUrl: 'https://github.com/dnum-mi/psij', isInfra: false, isPrivate: false })
//   await repositoryFailed(repo1.id)
//   await updateRepository(repo0.id, { externalUserName: 'toto' })
//   await repositoryDeleting(repo1.id)

//   // Delete a repository
//   await deleteRepository(repo1.id)

//   // Archive a project
//   await projectArchiving(projectTest.id)
// }
