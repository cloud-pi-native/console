import Joi from 'joi'
import { allEnv, projectStatus } from '../utils/iterables.js'

export const environmentSchema = Joi.object({
  id: Joi.string()
    .uuid()
    .required(),

  name: Joi.string()
    .valid(...allEnv)
    .required(),

  projectId: Joi.string()
    .uuid()
    .required(),

  status: Joi.string()
    .valid(...projectStatus),
  // .required(),
})
