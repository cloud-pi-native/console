import Joi from 'joi'

export const organizationSchema = Joi.object({
  id: Joi.string()
    .uuid(),

  name: Joi.string()
    .min(2)
    .max(10)
    .pattern(/^[a-z-]*$/)
    .required(),

  label: Joi.string()
    .required(),

  active: Joi.boolean(),
})
