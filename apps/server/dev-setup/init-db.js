import { createUser, getUserById } from '../src/models/users-queries.js'
import { createOrganization } from './../src/models/organization-queries.js'
import { projectInitializing, projectArchiving, projectCreated, projectFailed, projectAddUser, getProject } from './../src/models/project-queries2.js'
import { allOrganizations } from 'shared/src/utils/iterables.js'
import { getEnvironment, environmentInitializing, environmentCreated, environmentFailed } from '../src/models/environment-queries.js'
import { setPermission } from '../src/models/permission-queries.js'
import { repositoryCreated, repositoryFailed, repositoryInitializing, repositoryDeleting, updateRepository, deleteRepository } from '../src/models/repository-queries.js'

export const initDb = async () => {
  // Create organizations
  for (const org of allOrganizations) {
    await createOrganization(org)
  }
  // Create users
  await createUser({
    id: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6565',
    email: 'test@test.com',
    firstName: 'test',
    lastName: 'com',
  })
  await createUser({
    id: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6464',
    email: 'toto@test.com',
    firstName: 'toto',
    lastName: 'com',
  })
  await getUserById('cb8e5b4b-7b7b-40f5-935f-594f48ae6464')
  // Create projects
  await projectInitializing({ name: 'test-projet', organization: 'dinum', ownerId: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6565' })
  await projectCreated({ name: 'test-projet', organization: 'dinum' })
  await projectInitializing({ name: 'failed-projet', organization: 'dinum', ownerId: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6565' })
  await projectFailed({ name: 'failed-projet', organization: 'dinum' })
  await projectInitializing({ name: 'toto-projet', organization: 'dinum', ownerId: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6464' })
  await projectCreated({ name: 'toto-projet', organization: 'dinum' })
  // Add user to project
  await projectAddUser({ name: 'toto-projet', organization: 'dinum', userId: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6565' })
  const project = await getProject({ name: 'toto-projet', organization: 'dinum' })
  // Create environments for a project
  await environmentInitializing({ name: 'staging', projectId: project.dataValues.id })
  await environmentInitializing({ name: 'prod', projectId: project.dataValues.id })
  const envStaging = await getEnvironment({ projectId: project.dataValues.id, name: 'staging' })
  const envProd = await getEnvironment({ projectId: project.dataValues.id, name: 'prod' })
  await environmentCreated(envStaging.dataValues.id)
  await environmentFailed(envProd.dataValues.id)
  // Set permissions for a user on given environments
  await setPermission({ userId: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6565', envId: envStaging.dataValues.id, level: 0 })
  await setPermission({ userId: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6565', envId: envProd.dataValues.id, level: 10 })
  // Create repositories for a project
  const repo0 = await repositoryInitializing({ projectId: project.dataValues.id, internalRepoName: 'candilib', externalRepoUrl: 'https://github.com/dnum-mi/candilib', externalUserName: 'test', externalToken: 'token', isInfra: false, isPrivate: true })
  await repositoryCreated(repo0.dataValues.id)
  const repo1 = await repositoryInitializing({ projectId: project.dataValues.id, internalRepoName: 'psij', externalRepoUrl: 'https://github.com/dnum-mi/psij', isInfra: false, isPrivate: false })
  await repositoryFailed(repo1.dataValues.id)
  await updateRepository(repo0.dataValues.id, { externalUserName: 'toto' })
  await repositoryDeleting(repo1.dataValues.id)
  // Delete a repository
  await deleteRepository(repo1.dataValues.id)
  // Archive a project
  await projectArchiving({ name: 'test-projet', organization: 'dinum', ownerId: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6565' })
}
