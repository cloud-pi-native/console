import Joi from 'joi'
import { allStatus } from '../utils/const.js'

export const repoSchema = Joi.object({
  id: Joi.string()
    .uuid(),

  internalRepoName: Joi.string()
    .pattern(/^[a-z0-9]+[a-z0-9-]+[a-z0-9]+$/)
    .required(),

  externalRepoUrl: Joi.string()
    .uri({
      scheme: [
        'https',
      ],
    })
    .pattern(/^https:\/\/.*\.git$/)
    .required(),

  isPrivate: Joi.boolean(),

  isInfra: Joi.boolean(),

  externalUserName: Joi.string()
    .pattern(/^[a-zA-Z0-9_-]+$/)
    .when('isPrivate', { is: true, then: Joi.required() })
    .when('isPrivate', { is: false, then: Joi.string().allow('', null) }),

  externalToken: Joi.string()
    .pattern(/^[a-zA-Z0-9=_-]+$/)
    .when('isPrivate', { is: true, then: Joi.required() })
    .when('isPrivate', { is: false, then: Joi.string().allow('', null) }),

  status: Joi.string()
    .valid(...allStatus),

  projectId: Joi.string()
    .uuid()
    .optional(),

  createdAt: Joi.date()
    .optional(),

  updatedAt: Joi.date()
    .optional(),
})
