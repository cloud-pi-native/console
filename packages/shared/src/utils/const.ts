export const adminGroupPath = '/admin'

export const inClusterLabel = 'in-cluster' as const
export const projectIsLockedInfo = 'Le projet est verrouillé, pas d\'action possible'
export const missingCredentials = 'Si le dépôt est privé, vous devez renseigner au moins le nom d\'utilisateur ou le token'
export const invalidGitUrl = 'L\'adresse doit commencer par https et se terminer par .git'
export const invalidInternalRepoName = 'Le nom du dépôt ne doit contenir ni majuscules, ni espaces, ni caractères spéciaux hormis le trait d\'union, et doit commencer et se terminer par un caractère alphanumérique'

export const fakeToken = 'fakeToken'
export const tokenHeaderName = 'x-dso-token'
export const swaggerUiPath = '/swagger-ui'

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

export const longestEnvironmentName = 11 as const

export const allStatus = [
  'initializing',
  'created',
  'failed',
  'deleting',
] as const

export const projectStatus = [
  'initializing',
  'created',
  'failed',
  'archived',
  'warning',
] as const

export const achievedStatus = [
  'created',
  'failed',
] as const

export type AchievedStatus = typeof achievedStatus[number]

export enum ClusterPrivacy {
  PUBLIC = 'public',
  DEDICATED = 'dedicated',
}

export enum AllStatus {
  CREATED = 'created',
  FAILED = 'failed',
  DELETING = 'deleting',
}

export const logActions = [
  'Create Project',
  'Create Repository',
  'Create Environment',
  'Delete Project',
  'Delete Repository',
  'Delete Environment',
]

export const statusDict = {
  locked: {
    false: {
      testId: 'unlocked-badge',
      type: 'success',
      icon: 'ri:lock-unlock-line',
      wording: 'déverrouillé',
      animation: '',
      color: 'var(--success-425-625)',
    },
    true: {
      testId: 'locked-badge',
      type: 'warning',
      icon: 'ri:lock-line',
      wording: 'verrouillé',
      animation: '',
      color: 'var(--warning-425-625)',
    },
  },
  status: {
    created: {
      testId: 'created-badge',
      type: 'success',
      icon: 'ri:check-line',
      wording: 'opérations réussies',
      animation: '',
      color: 'var(--success-425-625)',
    },
    failed: {
      testId: 'failed-badge',
      type: 'error',
      icon: 'ri:close-line',
      wording: 'opérations échouées',
      animation: '',
      color: 'var(--error-425-625)',
    },
    initializing: {
      testId: 'initializing-badge',
      type: 'info',
      icon: 'ri:loader-4-line',
      animation: 'spin',
      wording: 'opérations en cours',
      color: 'var(--info-425-625)',
    },
    archived: {
      testId: 'archived-badge',
      type: 'info',
      icon: 'ri:archive-line',
      wording: 'archivé',
      animation: '',
      color: 'var(--text-mention-grey)',
    },
    warning: {
      testId: 'warning-badge',
      type: 'warning',
      icon: 'ri:alert-line',
      wording: 'partiellement dégradé',
      animation: '',
      color: 'var(--warning-425-625)',
    },
  },
} as const
