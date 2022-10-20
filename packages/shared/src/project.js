import Joi from 'joi'

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

export const repoSchema = Joi.object({
  gitName: Joi.string()
    .alphanum()
    .required(),

  gitSourceName: Joi.string()
    .required(),

  managerName: Joi.string()
    .required(),

  isPrivate: Joi.boolean()
    .required(),

  gitToken: Joi.string(),
})

export const projectSchema = Joi.object({
  id: Joi.string()
    .required(),

  email: Joi.string()
    .email()
    .required(),

  orgName: Joi.string()
    .valid(...allOrgNames)
    .required(),

  projectName: Joi.string()
    .alphanum()
    .required(),

  repo: Joi.array()
    .items(repoSchema)
    .required(),

  services: Joi.array()
    .items(Joi.string().valid(...allServices))
    .required(),
})
