import { projectRoles, allOrganizations, allEnv } from 'shared'
import {
  getRandomOrganization,
  getRandomProject,
  getRandomUser,
  getRandomRepo,
  getRandomEnv,
  getRandomPerm,
  getRandomRole,
  getRandomCluster,
} from './random-utils.js'
import { repeatFn } from './func-utils.js'
import { User } from './types.js'

export const createRandomDbSetup = ({ nbUsers = 1, nbRepo = 3, envs = allEnv, organizationName = allOrganizations[0].name }) => {
  // Create organization
  const allOrganizationsWhereName = allOrganizations.find(org => org.name === organizationName)
  const organization = getRandomOrganization(allOrganizationsWhereName?.name, allOrganizationsWhereName?.label)

  // Create users
  const users: User[] = repeatFn(nbUsers)(getRandomUser)

  // Create project
  const project = getRandomProject(organization.id)

  // Create Roles association table
  project.roles = users.map(user => ({
    ...getRandomRole(user.id, project.id),
    user,
  }))
  project.roles[0].role = projectRoles[0]

  // Create repositories
  project.repositories = repeatFn(nbRepo)(getRandomRepo, project.id)

  // Create environment
  project.environments = envs.map(env => getRandomEnv(env, project.id))

  // Create permissions
  project.environments.forEach(env => {
    env.permissions = users.map(user =>
      getRandomPerm(env.id, user),
    )
  })

  // Associate cluster with environments
  project.environments.forEach(env => {
    env.clusters = repeatFn(2)(getRandomCluster)
  })

  // Create clusters
  project.clusters = [getRandomCluster([project.id])]

  return {
    organization,
    users,
    project,
  }
}
