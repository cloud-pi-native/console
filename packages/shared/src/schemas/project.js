import Joi from 'joi'
import { projectStatus } from '../utils/iterables.js'

// TODO : status et locked doivent être required, prévoir migration
export const projectSchema = Joi.object({
  id: Joi.string()
    .uuid(),

  name: Joi.string()
    .pattern(/^[a-z0-9-]+$/)
    .min(2)
    .max(Joi.ref('$projectNameMaxLength'))
    .required(),

  organization: Joi.string()
    .uuid()
    .required(),

  status: Joi.string()
    .valid(...projectStatus),
  // .required(),

  locked: Joi.boolean(),
  // .required(),
})
