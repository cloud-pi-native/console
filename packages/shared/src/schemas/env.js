import Joi from 'joi'
import { allStatus, allEnv } from '../utils/iterables.js'

export const envSchema = Joi.object({
  envName: Joi.string()
    .valid(...allEnv)
    .required(),

  ro: Joi.array()
    .items(Joi.string()),

  rw: Joi.array()
    .items(Joi.string()),

  status: Joi.string()
    .valid(...allStatus)
    .required(),
})
