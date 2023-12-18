import { nonSensitiveClusterOpenApiSchema, sensitiveClusterOpenApiSchema } from './cluster.js'
import { environmentOpenApiSchema } from './environment.js'
import { organizationOpenApiSchema } from './organization.js'
import { permissionOpenApiSchema } from './permission.js'
import { projectOpenApiSchema, serviceOpenApiSchema } from './project.js'
import { quotaOpenApiSchema, quotaStageOpenApiSchema } from './quota.js'
import { repositoryOpenApiSchema } from './repository.js'
import { stageOpenApiSchema } from './stage.js'
import { roleOpenApiSchema, userOpenApiSchema } from './user.js'

export const openApiSchemas = {
  environmentOpenApiSchema,
  nonSensitiveClusterOpenApiSchema,
  organizationOpenApiSchema,
  permissionOpenApiSchema,
  serviceOpenApiSchema,
  quotaOpenApiSchema,
  quotaStageOpenApiSchema,
  repositoryOpenApiSchema,
  roleOpenApiSchema,
  sensitiveClusterOpenApiSchema,
  stageOpenApiSchema,
  userOpenApiSchema,
  projectOpenApiSchema,
}
