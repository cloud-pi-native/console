import Joi from 'joi'

export const clusterSchema = Joi.object({
  id: Joi.string()
    .uuid(),

  name: Joi.string()
    .pattern(/^[a-zA-Z0-9-]+$/)
    .max(50)
    .required(),

  server: Joi.string()
    .uri({
      scheme: [
        'https',
      ],
    })
    .pattern(/^https:\/\/.*$/)
    .required(),

  secretName: Joi.string().max(50),
  // .required(),

  config: Joi.string().max(50),

  customResources: Joi.boolean(),
})
