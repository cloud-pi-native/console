import Joi from 'joi'
import { allStatus } from '../utils/iterables.js'

// TODO : isInfra, isPrivate et status doivent être required, prévoir migration
export const repoSchema = Joi.object({
  id: Joi.string()
    .uuid()
    .required(),

  internalRepoName: Joi.string()
    .pattern(/^[a-zA-Z0-9-]+$/)
    .required(),

  externalRepoUrl: Joi.string()
    .uri({
      scheme: [
        'https',
      ],
    })
    .required(),

  isPrivate: Joi.boolean(),
  // .required(),

  isInfra: Joi.boolean(),
  // .required(),

  externalUserName: Joi.string()
    .when('isPrivate', { is: true, then: Joi.required() }),

  externalToken: Joi.string()
    .when('isPrivate', { is: true, then: Joi.required() }),

  status: Joi.string()
    .valid(...allStatus),
  // .required(),
})
