import type {
  Deployment,
  EnvironmentWithDeploymentsCount,
  ProjectService,
  ProjectV2,
  Repo,
} from '@cpn-console/shared'
import { getPermsByUserRoles, PROJECT_PERMS, resourceListToDict } from '@cpn-console/shared'

export type ProjectOperations = 'create'
  | 'delete'
  | 'deploymentManagement'
  | 'envManagement'
  | 'repoManagement'
  | 'teamManagement'
  | 'searchSecret'
  | 'replay'
  | 'update'
  | 'lockHandling'
  | 'saveServices'
  | 'roleManagement'

/**
 * Plain, serialisable project state held by the Pinia store.
 *
 * The previous implementation stored a `Project` class instance with nested
 * mutable command objects. That made every API call reachable from any child
 * component and bypassed the store as the single mutation path.
 */
export interface Project extends ProjectV2 {
  myPerms: bigint
  operationsInProgress: string[]
  needReplay: boolean
  repositories: Repo[]
  environments: EnvironmentWithDeploymentsCount[]
  deployments: Deployment[]
  services: ProjectService[]
}

export function calculateProjectPerms(project: Pick<ProjectV2, 'ownerId' | 'members' | 'roles' | 'everyonePerms'> | undefined, userId: string | undefined): bigint {
  if (!project || !userId) return 0n
  if (userId === project.ownerId) return PROJECT_PERMS.MANAGE
  const selfMember = project.members.find(member => member.userId === userId)
  if (!selfMember) return 0n

  return getPermsByUserRoles(selfMember.roleIds, resourceListToDict(project.roles), project.everyonePerms)
}

export function createProjectState(project: ProjectV2, userId: string | undefined): Project {
  return {
    ...project,
    myPerms: calculateProjectPerms(project, userId),
    operationsInProgress: [],
    needReplay: false,
    repositories: [],
    environments: [],
    deployments: [],
    services: [],
  }
}
