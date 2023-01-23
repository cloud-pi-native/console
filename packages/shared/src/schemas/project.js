import Joi from 'joi'
import { allOrganizations, projectStatus } from '../utils/iterables.js'

// TODO : status et locked doivent être required, prévoir migration
export const projectSchema = Joi.object({
  id: Joi.string()
    .uuid()
    .required(),

  name: Joi.string()
    .pattern(/^[a-z0-9-]+$/)
    .required(),

  ownerId: Joi.string()
    .required(),

  organization: Joi.string()
    .valid(...allOrganizations.map(org => org.name))
    .required(),

  usersId: Joi.array()
    .items(Joi.string().uuid())
    .required(),

  status: Joi.string()
    .valid(...projectStatus),
  // .required(),

  locked: Joi.boolean(),
  // .required(),
})
