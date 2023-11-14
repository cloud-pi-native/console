import { FromSchema } from 'json-schema-to-ts'
import { deletePermissionSchema, setPermissionSchema, updatePermissionSchema } from './openApiSchema.js'

export type SetPermissionDto = FromSchema<typeof setPermissionSchema['body']>

export type UpdatePermissionDto = FromSchema<typeof updatePermissionSchema['body']>

export type PermissionParams = FromSchema<typeof updatePermissionSchema['params']>

export type DeletePermissionParams = FromSchema<typeof deletePermissionSchema['params']>
