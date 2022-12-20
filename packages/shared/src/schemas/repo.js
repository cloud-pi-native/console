import Joi from 'joi'

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

  isPrivate: Joi.boolean()
    .required(),

  isInfra: Joi.boolean()
    .required(),

  externalUserName: Joi.string()
    .when('isPrivate', { is: true, then: Joi.required() }),

  externalToken: Joi.string()
    .when('isPrivate', { is: true, then: Joi.required() }),
})
