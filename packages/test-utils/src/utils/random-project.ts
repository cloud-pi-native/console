import { projectRoles, allOrganizations } from '@dso-console/shared'
import {
  getRandomOrganization,
  getRandomProject,
  getRandomUser,
  getRandomRepo,
  getRandomEnv,
  getRandomPerm,
  getRandomRole,
  getRandomCluster,
  getRandomStage,
  getRandomQuota,
  getRandomQuotaStage,
} from './random-utils.js'
import { repeatFn } from './func-utils.js'
import { User } from './types.js'

const basicStages = ['dev', 'staging', 'integration', 'prod']

export const createRandomDbSetup = ({ nbUsers = 1, nbRepo = 3, envs = basicStages, organizationName = allOrganizations[0].name }) => {
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

  // Create cluster
  project.clusters = [getRandomCluster([project.id])]

  // Create stages
  const stages = basicStages.map(baseEnvironment => getRandomStage(baseEnvironment))
  stages.forEach(stage => {
    // @ts-ignore
    stage.clusters = project.clusters
  })

  // Create quotas
  const quotas = repeatFn(4)(getRandomQuota)

  // Associate stages and quotas
  stages.forEach(stage => {
    // @ts-ignore
    stage.quotaStage = quotas.map(quota => {
      const quotaStage = getRandomQuotaStage(quota.id, stage.id, 'active')
      quota.quotaStage = quotaStage
      return quotaStage
    })
  })

  // Create repositories
  project.repositories = repeatFn(nbRepo)(getRandomRepo, project.id)

  // Create environment
  project.environments = envs
    // @ts-ignore
    .map(env => getRandomEnv(env, project.id, stages[0].quotaStage[0].id, project.clusters[0].id))

  // Create permissions
  project.environments.forEach(env => {
    env.permissions = users.map(user =>
      getRandomPerm(env.id, user),
    )
  })

  return {
    organization,
    users,
    stages,
    quotas,
    project,
  }
}
