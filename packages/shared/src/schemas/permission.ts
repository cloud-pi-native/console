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
    .max(2),
  // .required(),

  createdAt: Joi.date()
    .optional(),

  updatedAt: Joi.date()
    .optional(),
})
