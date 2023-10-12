import Joi from 'joi'
import { projectStatus } from '../utils/const.js'

export const environmentSchema = Joi.object({
  id: Joi.string()
    .uuid(),

  name: Joi.string()
    .required()
    .pattern(/^[a-z0-9-]+$/)
    .min(2)
    .max(11),

  projectId: Joi.string()
    .uuid()
    .required(),

  quotaStageId: Joi.string()
    .uuid()
    .required(),

  clusterId: Joi.string()
    .uuid()
    .required(),

  status: Joi.string()
    .valid(...projectStatus),

  permissions: Joi.array(),

  quotaStage: Joi.object(),

  createdAt: Joi.date(),

  updatedAt: Joi.date(),

})
