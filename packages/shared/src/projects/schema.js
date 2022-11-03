import Joi from 'joi'
import { allOrgNames, allServices } from './utils.js'

export const repoSchema = Joi.object({
  internalRepoName: Joi.string()
    .pattern(/^[a-zA-Z0-9-]+$/)
    .required(),

  externalRepoUrl: Joi.string()
    .uri({
      scheme: [
        'git',
        'https',
      ],
    })
    .required(),

  isPrivate: Joi.boolean(),

  externalUserName: Joi.string()
    .when('isPrivate', { is: true, then: Joi.required() }),

  externalToken: Joi.string()
    .when('isPrivate', { is: true, then: Joi.required() }),
})

export const userSchema = Joi.object({
  id: Joi.string()
    .required(),

  email: Joi.string()
    .email({ tlds: { allow: false } })
    .required(),

  firstName: Joi.string(),

  lastName: Joi.string(),
})

export const projectSchema = Joi.object({
  id: Joi.string()
    .required(),

  orgName: Joi.string()
    .valid(...allOrgNames)
    .required(),

  projectName: Joi.string()
    .pattern(/^[a-zA-Z0-9-]+$/)
    .required(),

  repos: Joi.array()
    .items(repoSchema)
    .unique('internalRepoName'),

  services: Joi.array()
    .items(Joi.string().valid(...allServices))
    .required(),

  owner: userSchema
    .required(),

  users: Joi.array()
    .items(userSchema),
})
