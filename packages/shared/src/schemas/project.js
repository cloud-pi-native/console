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

export const allStatus = [
  'initializing',
  'created',
  'failed',
  'deleting',
]

export const projectStatus = [
  'initializing',
  'created',
  'failed',
  'archived',
]

export const achievedStatus = [
  'created',
  'failed',
]

export const allEnv = [
  'dev',
  'staging',
  'integration',
  'prod',
]

export const projectSchema = Joi.object({
  id: Joi.string()
    .required(),

  orgName: Joi.string()
    .valid(...allOrgNames)
    .required(),

  projectName: Joi.string()
    .pattern(/^[a-z0-9-]+$/)
    .required(),

  repos: Joi.array()
    .items(repoSchema)
    .unique('internalRepoName'),

  services: Joi.array()
    .items(Joi.string().valid(...allServices).required())
    .required(),

  status: Joi.string()
    .valid(...projectStatus)
    .required(),

  envList: Joi.array()
    .items(Joi.string().valid(...allEnv).required())
    .required(),

  locked: Joi.boolean()
    .required(),

  owner: userSchema
    .required(),

  users: Joi.array()
    .items(userSchema)
    .unique('email'),
})
