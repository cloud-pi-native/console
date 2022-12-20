import Joi from 'joi'
import { allStatus } from '../utils/iterables.js'

export const userSchema = Joi.object({
  id: Joi.string()
    .required(),

  email: Joi.string()
    .email({ tlds: { allow: false } })
    .required(),

  firstName: Joi.string(),

  lastName: Joi.string(),

  status: Joi.string()
    .valid(...allStatus)
    .required(),
})
