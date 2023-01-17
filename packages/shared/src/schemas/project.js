import Joi from 'joi'
import { repoSchema } from './repo.js'
import { userSchema } from './user.js'
import { envSchema } from './env.js'
import {
  allOrgNames,
  allServices,
  projectStatus,
} from 'shared/src/utils/iterables.js'

export const projectSchema = Joi.object({
  id: Joi.string()
    .required(),

  orgName: Joi.string()
    .valid(...allOrgNames)
    .required(),

  projectName: Joi.string()
    .pattern(/^[a-z0-9-]+$/)
    .required(),

  repos: Joi.array()
    .items(repoSchema)
    .unique('internalRepoName'),

  services: Joi.array()
    .items(Joi.string().valid(...allServices).required())
    .required(),

  status: Joi.string()
    .valid(...projectStatus)
    .required(),

  // TODO : keys parmi allEnv
  envList: Joi.object({
    dev: envSchema,
    staging: envSchema,
    integration: envSchema,
    prod: envSchema,
  }),

  locked: Joi.boolean()
    .required(),

  owner: userSchema
    .required(),

  users: Joi.array()
    .items(userSchema)
    .unique('email'),
})
