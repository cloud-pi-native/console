import Joi from 'joi'
import { allStatus } from 'shared/src/utils/iterables.js'

export const envSchema = Joi.object({
  ro: Joi.array()
    .items(Joi.string()),

  rw: Joi.array()
    .items(Joi.string()),

  status: Joi.string()
    .valid(...allStatus)
    .required(),
})
