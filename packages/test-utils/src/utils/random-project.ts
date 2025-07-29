import { projectRoles } from '@cpn-console/shared'
import {
  getRandomCluster,
  getRandomEnv,
  getRandomPerm,
  getRandomProject,
  getRandomQuota,
  getRandomRepo,
  getRandomRole,
  getRandomStage,
  getRandomUser,
  getRandomZone,
} from './random-utils.js'
import { repeatFn } from './func-utils'
import type { User } from './types'

const basicStages = ['dev', 'staging', 'integration', 'prod']

export function createRandomDbSetup({ nbUsers = 1, nbRepo = 3, envs = basicStages }) {
  // Create users
  const users: User[] = repeatFn(nbUsers)(getRandomUser)

  // Create project
  const project = getRandomProject()

  // Create Roles association table
  project.roles = users.map(user => ({
    ...getRandomRole(user.id, project.id),
    user,
  }))
  project.roles[0].role = projectRoles[0]
  const ownerId = project.roles.find(role => role.role === 'owner')?.userId

  // @ts-ignore
  project.members = project.roles.map(({ userId, user: { id: _, ...user }, role }) => {
    return {
      userId,
      role,
      ...user,
    }
  })

  // Create zone
  const zones = [getRandomZone()]

  // Create cluster
  const clusters = [getRandomCluster({ projectIds: [project.id], zoneId: zones[0].id })]
  // @ts-ignore
  project.clusters = clusters

  // Create stages
  const stages = basicStages.map(baseEnvironment => getRandomStage(baseEnvironment))
  stages.forEach((stage) => {
    // @ts-ignore
    stage.clusters = project.clusters
  })

  // Create quotas
  const quotas = repeatFn(4)(getRandomQuota)

  // Associate stages and quotas
  stages.forEach((stage) => {
    stage.quotaIds = quotas.map(({ id }) => id)
  })

  // Associate stages and quotas
  quotas.forEach((quota) => {
    quota.stageIds = stages.map(({ id }) => id)
  })

  // Create repositories
  project.repositories = repeatFn(nbRepo)(getRandomRepo, project.id)

  // Create environment
  project.environments = envs
    .map(env => getRandomEnv(env, project.id, stages[0].id, quotas[0].id, clusters[0].id))

  // Create permissions
  project.environments.forEach((env) => {
    env.permissions = users.map(user =>
      user.id === ownerId ? getRandomPerm(env.id, user, 2) : getRandomPerm(env.id, user),
    )
  })

  return {
    users,
    stages,
    zones,
    quotas,
    project,
  }
}
