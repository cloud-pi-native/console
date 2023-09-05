import Joi from 'joi'
import { projectStatus } from '../utils/const.js'

export const descriptionMaxLength = 280

export const projectSchema = Joi.object({
  id: Joi.string()
    .uuid(),

  name: Joi.string()
    .pattern(/^[a-z0-9-]+$/)
    .min(2)
    .max(Joi.ref('$projectNameMaxLength'))
    .required(),

  description: Joi.string().allow('')
    .max(descriptionMaxLength),

  organizationId: Joi.string()
    .uuid()
    .required(),

  services: Joi.object(),

  status: Joi.string()
    .valid(...projectStatus),
  // .required(),

  locked: Joi.boolean(),
  // .required(),

  createdAt: Joi.date()
    .optional(),

  updatedAt: Joi.date()
    .optional(),

  // ProjectInfos
  organization: Joi.object(),
  roles: Joi.array(),
  clusters: Joi.array(),
  repositories: Joi.array(),
  environments: Joi.array(),
})
