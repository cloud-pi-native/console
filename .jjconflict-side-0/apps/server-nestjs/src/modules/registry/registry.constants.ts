// Registry plugin identification
export const PLUGIN_NAME = 'harbor'

// Registry configuration keys
export const REGISTRY_CONFIG_KEY_QUOTA_HARD_LIMIT = 'quotaHardLimit'
export const REGISTRY_CONFIG_KEY_PUBLISH_PROJECT_ROBOT = 'publishProjectRobot'

// Default platform-level group paths
export const DEFAULT_PLATFORM_ADMIN_GROUP_PATHS = '/console/admin'
export const DEFAULT_PLATFORM_GUEST_GROUP_PATHS = '/console/security,/console/readonly'

// Default project-level group path suffixes
export const DEFAULT_PROJECT_ADMIN_GROUP_PATH_SUFFIXES = '/console/admin'
export const DEFAULT_PROJECT_MAINTAINER_GROUP_PATH_SUFFIXES = '/console/devops'
export const DEFAULT_PROJECT_DEVELOPER_GROUP_PATH_SUFFIXES = '/console/developer'
export const DEFAULT_PROJECT_GUEST_GROUP_PATH_SUFFIXES = '/console/security,/console/readonly'

// Platform group path plugin configuration keys
export const PLATFORM_ADMIN_GROUP_PATH_PLUGIN_KEY = 'platformAdminGroupPath'
export const PLATFORM_GUEST_GROUP_PATHS_PLUGIN_KEY = 'platformGuestGroupPaths'

// Project group path suffixes plugin configuration keys
export const PROJECT_ADMIN_GROUP_PATH_SUFFIXES_PLUGIN_KEY = 'projectAdminGroupPathSuffixes'
export const PROJECT_MAINTAINER_GROUP_PATH_SUFFIXES_PLUGIN_KEY = 'projectMaintainerGroupPathSuffixes'
export const PROJECT_DEVELOPER_GROUP_PATH_SUFFIXES_PLUGIN_KEY = 'projectDeveloperGroupPathSuffixes'
export const PROJECT_GUEST_GROUP_PATH_SUFFIXES_PLUGIN_KEY = 'projectGuestGroupPathSuffixes'

// Registry robot name identifiers
export const ROBOT_NAME_RO = 'ro-robot'
export const ROBOT_NAME_RW = 'rw-robot'
export const ROBOT_NAME_PROJECT = 'project-robot'

// Page size used when listing robots. A project only ever owns a handful of
// robots (ro, rw and optionally the project robot — 3 in practice), so a single
// page is plenty; this simply bounds each pagination request.
export const ROBOT_LIST_PAGE_SIZE = 100

// Allowed Harbor retention rule templates
export const ALLOWED_RETENTION_RULE_TEMPLATES = [
  'always',
  'latestPulledK',
  'latestPushedK',
  'nDaysSinceLastPull',
  'nDaysSinceLastPush',
] as const

// Harbor role identifiers
export const HARBOR_ROLE_PROJECT_ADMIN = 1
export const HARBOR_ROLE_DEVELOPER = 2
export const HARBOR_ROLE_GUEST = 3
export const HARBOR_ROLE_MAINTAINER = 4
export const HARBOR_ROLE_LIMITED_GUEST = 5
