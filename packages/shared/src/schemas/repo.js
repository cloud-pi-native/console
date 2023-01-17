import Joi from 'joi'
import { allStatus } from 'shared/src/utils/iterables.js'

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

  isInfra: Joi.boolean(),

  externalUserName: Joi.string()
    .when('isPrivate', { is: true, then: Joi.required() }),

  externalToken: Joi.string()
    .when('isPrivate', { is: true, then: Joi.required() }),

  status: Joi.string()
    .valid(...allStatus)
    .required(),
})
