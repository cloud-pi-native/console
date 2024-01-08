import { FromSchema } from 'json-schema-to-ts'
import { projectOpenApiSchema, monitorServicesOpenApiSchema, toServiceOpenApiSchema } from './index.js'

export type ProjectModel = FromSchema<typeof projectOpenApiSchema>

export type MonitorServiceModel = FromSchema<typeof monitorServicesOpenApiSchema>

export type ToServiceModel = FromSchema<typeof toServiceOpenApiSchema>
