import Joi from 'joi'

export const clusterSchema = Joi.object({
  id: Joi.string()
    .uuid()
    .optional(),

  projectsId: Joi.array(),

  label: Joi.string()
    .pattern(/^[a-zA-Z0-9-]+$/)
    .max(50),

  secretName: Joi.string()
    .optional()
    .max(50),

  clusterResources: Joi.boolean(),

  privacy: Joi.string()
    .valid('public', 'dedicated'),

  user: Joi.object(),

  cluster: Joi.object(),
})
