import Joi from 'joi'

export const stageSchema = Joi.object({
  id: Joi.string()
    .uuid(),

  name: Joi.string()
    .required(),

  quotaIds: Joi.array()
    .optional(),

  quotaStage: Joi.array()
    .optional(),

  clusterIds: Joi.array()
    .optional(),

  clusters: Joi.array()
    .optional(),

  createdAt: Joi.date()
    .optional(),

  updatedAt: Joi.date()
    .optional(),
})
