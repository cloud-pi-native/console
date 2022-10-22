import Joi from 'joi'
import { allOrgNames, allServices } from './utils.js'

export const repoSchema = Joi.object({
  gitName: Joi.string()
    .pattern(/^[a-zA-Z0-9-]+$/)
    .required(),

  gitSourceName: Joi.string()
    .required(),

  managerName: Joi.string()
    .required(),

  isPrivate: Joi.boolean()
    .required(),

  gitToken: Joi.string()
    .when('isPrivate', { is: true, then: Joi.required() }),
})

export const projectSchema = Joi.object({
  id: Joi.string()
    .required(),

  email: Joi.string()
    .email()
    .required(),

  orgName: Joi.string()
    .valid(...allOrgNames)
    .required(),

  projectName: Joi.string()
    .pattern(/^[a-zA-Z0-9-]+$/)
    .required(),

  repo: Joi.array()
    .items(repoSchema)
    .required(),

  services: Joi.array()
    .items(Joi.string().valid(...allServices))
    .required(),
})
