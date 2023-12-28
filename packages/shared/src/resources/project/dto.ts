import { FromSchema } from 'json-schema-to-ts'
import { createProjectSchema, getAllProjectsSchema, updateProjectSchema } from './openApiSchema.js'

export type CreateProjectDto = FromSchema<typeof createProjectSchema['body']>

export type UpdateProjectDto = FromSchema<typeof updateProjectSchema['body']>

export type ProjectParams = FromSchema<typeof updateProjectSchema['params']>

export type GetAllProjectsOutputDto = FromSchema<typeof getAllProjectsSchema['response']['200']>
