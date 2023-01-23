import Joi from 'joi'

export const permissionSchema = Joi.object({
  id: Joi.string()
    .uuid()
    .required(),

  userId: Joi.string()
    .uuid()
    .required(),

  environmentId: Joi.string()
    .uuid()
    .required(),

  level: Joi.number()
    .integer()
    .min(0)
    .max(10),
  // .required(),
})
