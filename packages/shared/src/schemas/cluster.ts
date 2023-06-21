import Joi from 'joi'

export const clusterSchema = Joi.object({
  id: Joi.string()
    .uuid(),

  projectsId: Joi.array()
    .optional(),

  label: Joi.string()
    .pattern(/^[a-zA-Z0-9-]+$/)
    .max(50)
    .required(),

  secretName: Joi.string()
    .max(50),

  clusterResources: Joi.boolean()
    .required(),

  privacy: Joi.string()
    .valid('public', 'dedicated')
    .required(),

  user: Joi.object()
    .required(),

  cluster: Joi.object()
    .required(),
})
