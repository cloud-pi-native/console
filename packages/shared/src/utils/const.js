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

export const projectDict = {
  locked: {
    false: {
      icon: 'ri-lock-unlock-fill',
      wording: 'déverrouillé',
      color: 'var(--success-425-625)',
    },
    true: {
      icon: 'ri-lock-fill',
      wording: 'verrouillé',
      color: 'var(--warning-425-625)',
    },
  },
  status: {
    created: {
      icon: 'ri-check-fill',
      wording: 'en succès',
      color: 'var(--success-425-625)',
    },
    failed: {
      icon: 'ri-close-line',
      wording: 'en échec',
      color: 'var(--warning-425-625)',
    },
    archived: {
      icon: 'ri-archive-fill',
      wording: 'archivé',
      color: 'var(--info-425-625)',
    },
  },
}
