import Joi from 'joi'
import { allEnv, projectStatus } from '../utils/const.js'

export const environmentSchema = Joi.object({
  id: Joi.string()
    .uuid(),

  name: Joi.string()
    .valid(...allEnv)
    .required(),

  projectId: Joi.string()
    .uuid()
    .required(),

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
