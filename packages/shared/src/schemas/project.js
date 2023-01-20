import Joi from 'joi'
import { repoSchema } from './repo.js'
import { userSchema } from './user.js'
import { envSchema } from './env.js'
import {
  allOrganizations,
  allServices,
  projectStatus,
} from '../utils/iterables.js'

// TODO : status et locked doivent être required, prévoir migration
// TODO vérifier que le schéma est toujours bon pour tous ceux qui l'utilisent
const organizationBlob = allOrganizations.map(org => org.name)
export const projectSchema = Joi.object({
  id: Joi.string()
    .required(),

  organization: Joi.string()
    .valid(...organizationBlob)
    .required(),

  name: Joi.string()
    .pattern(/^[a-z0-9-]+$/)
    .required(),

  repos: Joi.array()
    .items(repoSchema)
    .unique('internalRepoName'),

  services: Joi.array()
    .items(Joi.string().valid(...allServices).required())
    .required(),

  status: Joi.string()
    .valid(...projectStatus),
  // .required(),

  envList: Joi.array()
    .items(envSchema)
    .unique('envName'),

  locked: Joi.boolean(),
  // .required(),

  owner: userSchema
    .required(),

  users: Joi.array()
    .items(userSchema)
    .unique('email'),
})
