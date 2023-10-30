import Joi from 'joi'

export const quotaSchema = Joi.object({
  id: Joi.string()
    .uuid(),

  memory: Joi.string()
    .required(),

  cpu: Joi.number()
    .positive()
    .required(),

  name: Joi.string()
    .required(),

  isPrivate: Joi.boolean()
    .optional(),

  stageIds: Joi.array()
    .optional(),

  quotaStage: Joi.array()
    .optional(),

  createdAt: Joi.date()
    .optional(),

  updatedAt: Joi.date()
    .optional(),
})
