import {
  getRandomOrganization,
  getRandomProject,
  getRandomUser,
  getRandomRepo,
  getRandomEnv,
  getRandomPerm,
  getRandomUserProject,
} from './random-utils.js'
import { repeatFn } from './func-utils.js'
import { projectRoles, allOrganizations, allEnv } from 'shared/src/utils/iterables.js'

export const createRandomDbSetup = ({ nbUsers = 1, nbRepo = 3, envs = allEnv, organizationName = allOrganizations[0].name }) => {
  // Create organization
  const organization = getRandomOrganization(...Object.values(allOrganizations.find(org => org.name === organizationName)))

  // Create users
  const users = repeatFn(nbUsers)(getRandomUser)

  // Create project
  const project = getRandomProject(organization.id)

  // Create usersProjects association table
  project.users = users.map(user =>
    getRandomUserProject(user.id))
  project.users[0].role = projectRoles[0]

  // Create repositories
  project.repositories = repeatFn(nbRepo, project.id)(getRandomRepo)

  // Create environment
  project.environments = envs.map(env => getRandomEnv(env, project.id))

  // Create permissions
  project.environments.forEach(env => {
    env.permissions = users.map(user =>
      getRandomPerm(env.id, user),
    )
  })

  return {
    organization,
    users,
    project,
  }
}
