import Joi from 'joi'
import { repoSchema } from './repo.js'
import { userSchema } from './user.js'

export const allOrgNames = [
  'dinum',
  'ministere-interieur',
  'ministere-justice',
]

export const allServices = [
  'argocd',
  'gitlab',
  'nexus',
  'quay',
  'sonarqube',
  'vault',
]

export const projectSchema = Joi.object({
  id: Joi.string()
    .required(),

  orgName: Joi.string()
    .valid(...allOrgNames)
    .required(),

  projectName: Joi.string()
    .pattern(/^[a-zA-Z0-9-]+$/)
    .required(),

  repos: Joi.array()
    .items(repoSchema)
    .unique('internalRepoName'),

  services: Joi.array()
    .items(Joi.string().valid(...allServices))
    .required(),

  owner: userSchema
    .required(),

  users: Joi.array()
    .items(userSchema),
})
