import { apiPrefix, contractInstance } from '../api-client.js'
import {
  CreatePermissionSchema,
  GetPermissionsSchema,
  UpdatePermissionSchema,
  DeletePermissionSchema,
} from '../schemas/index.js'

export const permissionContract = contractInstance.router({
  createPermission: {
    method: 'POST',
    path: `${apiPrefix}/projects/:projectId/environments/:environmentId/permissions`,
    pathParams: CreatePermissionSchema.params,
    contentType: 'application/json',
    summary: 'Create permission',
    description: 'Create new permission.',
    body: CreatePermissionSchema.body,
    responses: CreatePermissionSchema.responses,
  },

  getPermissions: {
    method: 'GET',
    path: `${apiPrefix}/projects/:projectId/environments/:environmentId/permissions`,
    pathParams: GetPermissionsSchema.params,
    summary: 'Get permissions',
    description: 'Retrieved all permissions.',
    responses: GetPermissionsSchema.responses,
  },

  updatePermission: {
    method: 'PUT',
    path: `${apiPrefix}/projects/:projectId/environments/:environmentId/permissions`,
    summary: 'Update permission',
    description: 'Update a permission.',
    pathParams: UpdatePermissionSchema.params,
    body: UpdatePermissionSchema.body,
    responses: UpdatePermissionSchema.responses,
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
