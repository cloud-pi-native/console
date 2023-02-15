import Joi from 'joi'

export const userSchema = Joi.object({
  id: Joi.string()
    // .uuid()
    .required(),

  email: Joi.string()
    .email({ tlds: { allow: false } })
    .required(),

  firstName: Joi.string(),

  lastName: Joi.string(),
})
