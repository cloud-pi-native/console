import Joi from 'joi'

export const clusterSchema = Joi.object({
  id: Joi.string()
    .uuid()
    .optional()
    .allow(''),

  projectIds: Joi.array(),

  stageIds: Joi.array(),

  label: Joi.string()
    .pattern(/^[a-zA-Z0-9-]+$/)
    .max(50),

  infos: Joi.string()
    .optional()
    .allow('')
    .max(200),

  secretName: Joi.string()
    .optional()
    .allow('')
    .max(50),

  clusterResources: Joi.boolean(),

  privacy: Joi.string()
    .valid('public', 'dedicated'),

  user: Joi.object({
    username: Joi.string()
      .optional(),

    password: Joi.string()
      .optional(),

    keyData: Joi.string()
      .optional(),

    certData: Joi.string()
      .optional(),

    token: Joi.string()
      .optional(),
  }),

  cluster: Joi.object({
    server: Joi.string()
      .required(),

    tlsServerName: Joi.string(),

    skipTLSVerify: Joi.boolean()
      .optional(),

    caData: Joi.string()
      .optional(),
  }),
})
