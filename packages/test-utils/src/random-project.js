import {
  getRandomOrganization,
  getRandomProject,
  getRandomUser,
  getRandomRepo,
  getRandomEnv,
  getRandomPerm,
} from './random-utils.js'
import { repeatFn } from './func-utils.js'
import { allOrganizations, allEnv } from 'shared/src/utils/iterables.js'

export const createRandomDbSetup = ({ nbUsers = 0, nbRepo = 3, envs = allEnv, organizationName = allOrganizations[0].name }) => {
  // Create organization
  const organization = getRandomOrganization(...Object.values(allOrganizations.find(org => org.name === organizationName)))

  // Create users
  const owner = getRandomUser()
  const users = repeatFn(nbUsers)(getRandomUser)
  const usersOnlyId = users.map(user => user.id)
  const usersId = [owner.id, ...usersOnlyId]

  // Create project
  const project = getRandomProject(owner.id, usersOnlyId, organization.id)

  // Create repositories
  const repositories = repeatFn(nbRepo, project.id)(getRandomRepo)

  // Create environment
  const environments = envs.map(env => getRandomEnv(env, project.id))

  // Create permissions
  const permissions = usersId.map(userId =>
    environments.map(env =>
      getRandomPerm(env.id, userId),
    ))

  return {
    project,
    owner,
    users,
    repositories,
    environments,
    permissions,
  }
}
