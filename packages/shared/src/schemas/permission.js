import Joi from 'joi'

export const permissionSchema = Joi.object({
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
