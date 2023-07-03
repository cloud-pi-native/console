import Joi from 'joi'

export const organizationSchema = Joi.object({
  id: Joi.string()
    .uuid(),

  source: Joi.string(),

  name: Joi.string()
    .min(2)
    .max(10)
    .pattern(/^[a-z-]*$/)
    .required(),

  label: Joi.string()
    .required(),

  active: Joi.boolean(),

  createdAt: Joi.date()
    .optional(),

  updatedAt: Joi.date()
    .optional(),
})
