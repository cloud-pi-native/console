export const adminGroupPath = '/admin'

export const levels = [
  'r',
  'rw',
  'rwd',
]

export const projectRoles = [
  'owner',
  'user',
]

// ! Une organisation ne doit pas faire plus de 19 caractères
export const allOrganizations = [
  {
    name: 'dinum',
    label: 'DINUM',
  },
  {
    name: 'ministere-interieur',
    label: 'Ministère de l\'Intérieur',
  },
  {
    name: 'ministere-justice',
    label: 'Ministère de la Justice',
  },
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

// ! Un environnement ne doit pas faire plus de 11 caractères
export const allEnv = [
  'dev',
  'staging',
  'integration',
  'prod',
]
