import Joi from 'joi'
import { repoSchema } from './repo.js'
import { userSchema } from './user.js'
import { envSchema } from './env.js'
import {
  allOrganizations,
  allServices,
  projectStatus,
} from '../utils/iterables.js'

// TODO : status et locked doivent être required, prévoir migration

export const projectSchema = Joi.object({
  id: Joi.string()
    .required(),

  orgName: Joi.string()
    .valid(...allOrganizations)
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
    .valid(...projectStatus),
  // .required(),

  envList: Joi.array()
    .items(envSchema)
    .unique('envName'),

  locked: Joi.boolean(),
  // .required(),

  owner: userSchema
    .required(),

  users: Joi.array()
    .items(userSchema)
    .unique('email'),
})
