import Joi from 'joi'
import { projectStatus } from '../utils/const.js'

export const environmentSchema = Joi.object({
  id: Joi.string()
    .uuid(),

  projectId: Joi.string()
    .uuid()
    .required(),

  quotaId: Joi.string()
    .uuid(),

  dsoEnvironmentId: Joi.string()
    .uuid(),

  status: Joi.string()
    .valid(...projectStatus),
  // .required(),

  createdAt: Joi.date()
    .optional(),

  updatedAt: Joi.date(),

  clustersId: Joi.array()
    .optional(),

  permissions: Joi.array()
    .optional(),
})
