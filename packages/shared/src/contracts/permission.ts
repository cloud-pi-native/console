import { ClientInferRequest } from '@ts-rest/core'
import { apiPrefix, contractInstance } from '../api-client.js'
import {
  GetPermissionsSchema,
  UpsertPermissionSchema,
  DeletePermissionSchema,
} from '../schemas/index.js'

export const permissionContract = contractInstance.router({
  listPermissions: {
    method: 'GET',
    path: `${apiPrefix}/projects/:projectId/environments/:environmentId/permissions`,
    pathParams: GetPermissionsSchema.params,
    summary: 'Get permissions',
    description: 'Retrieved all permissions.',
    responses: GetPermissionsSchema.responses,
  },

  upsertPermission: {
    method: 'PUT',
    path: `${apiPrefix}/projects/:projectId/environments/:environmentId/permissions`,
    summary: 'Update permission',
    description: 'Update a permission.',
    pathParams: UpsertPermissionSchema.params,
    body: UpsertPermissionSchema.body,
    responses: UpsertPermissionSchema.responses,
  },

  deletePermission: {
    method: 'DELETE',
    path: `${apiPrefix}/projects/:projectId/environments/:environmentId/permissions/:userId`,
    summary: 'Delete permission',
    description: 'Delete a permission.',
    pathParams: DeletePermissionSchema.params,
    body: null,
    responses: DeletePermissionSchema.responses,
  },
})

export type UpsertPermissionBody = ClientInferRequest<typeof permissionContract.upsertPermission>['body']
