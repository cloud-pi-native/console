import {
  getRandomProject,
  getRandomUser,
  getRandomRepo,
  getRandomEnv,
  getRandomPerm,
} from './random-utils.js'
import { repeatFn } from './func-utils.js'
import { allEnv } from 'shared/src/utils/iterables.js'

export const createRandomProject = ({ nbUsers = 1, nbRepo = 3, envs = allEnv }) => {
  // Create users
  const owner = getRandomUser()
  const users = repeatFn(nbUsers)(getRandomUser)
  const usersId = [owner.id, ...users.map(user => user.id)]

  // Create project
  const project = getRandomProject(owner.id, usersId)

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
