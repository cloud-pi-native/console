import type {
  projectContract,
  projectRoleContract,
} from '@cpn-console/shared'
import type { ClientInferRequest } from '@ts-rest/core'

export type CreateProjectBody = ClientInferRequest<typeof projectContract.createProject>['body']
export type UpdateProjectBody = ClientInferRequest<typeof projectContract.updateProject>['body']
export type BulkActionProjectBody = ClientInferRequest<typeof projectContract.bulkActionProject>['body']

export type CreateProjectRoleBody = ClientInferRequest<typeof projectRoleContract.createProjectRole>['body']
export type PatchProjectRolesBody = ClientInferRequest<typeof projectRoleContract.patchProjectRoles>['body']
