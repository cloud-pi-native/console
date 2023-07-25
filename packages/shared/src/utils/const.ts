export const adminGroupPath = '/admin'

export const projectIsLockedInfo = 'Le projet est verrouillé, pas d\'action possible'

export const levels = [
  'r',
  'rw',
  'rwd',
] as const
export type PermissionLevels = typeof levels[number]

export const projectRoles = [
  'owner',
  'user',
] as const
export type ProjectRoles = typeof projectRoles[number]

// ! Une organisation ne doit pas faire plus de 19 caractères
export const allOrganizations = [
  {
    name: 'dinum',
    label: 'DINUM',
  },
  {
    name: 'mi',
    label: 'Ministère de l\'Intérieur',
  },
  {
    name: 'mj',
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
] as const

export const achievedStatus = [
  'created',
  'failed',
]

export const logActions = [
  'Create Project',
  'Create Repository',
  'Create Environment',
  'Delete Project',
  'Delete Repository',
  'Delete Environment',
]

// ! Un environnement ne doit pas faire plus de 11 caractères
export const allEnv = [
  'dev',
  'staging',
  'integration',
  'prod',
] as const

export const statusDict = {
  locked: {
    false: {
      testId: 'unlocked-badge',
      type: 'success',
      icon: 'ri-lock-unlock-fill',
      wording: 'déverrouillé',
      color: 'var(--success-425-625)',
    },
    true: {
      testId: 'locked-badge',
      type: 'warning',
      icon: 'ri-lock-fill',
      wording: 'verrouillé',
      color: 'var(--warning-425-625)',
    },
  },
  status: {
    created: {
      testId: 'created-badge',
      type: 'success',
      icon: 'ri-check-fill',
      wording: 'opérations réussies',
      color: 'var(--success-425-625)',
    },
    failed: {
      testId: 'failed-badge',
      type: 'error',
      icon: 'ri-close-line',
      wording: 'opérations échouées',
      color: 'var(--error-425-625)',
    },
    initializing: {
      testId: 'initializing-badge',
      type: 'info',
      icon: 'ri-loader-4-line',
      animation: 'spin',
      wording: 'opérations en cours',
      color: 'var(--info-425-625)',
    },
    archived: {
      icon: 'ri-archive-fill',
      wording: 'archivé',
      color: 'var(--text-mention-grey)',
    },
  },
}
