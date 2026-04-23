export const REGISTRY_PLUGIN_NAME = 'harbor'

export const REGISTRY_CONFIG_KEY_QUOTA_HARD_LIMIT = 'quotaHardLimit'
export const REGISTRY_CONFIG_KEY_PUBLISH_PROJECT_ROBOT = 'publishProjectRobot'

export const DEFAULT_ADMIN_GROUP_PATH_SUFFIXES = '/console/admin'
export const DEFAULT_MAINTAINER_GROUP_PATH_SUFFIXES = '/console/devops'
export const DEFAULT_DEVELOPER_GROUP_PATH_SUFFIXES = '/console/developer'
export const DEFAULT_GUEST_GROUP_PATH_SUFFIXES = '/console/security,/console/readonly'

export const PLATFORM_ADMIN_GROUP_PATH_PLUGIN_KEY = 'platformAdminGroupPath'
export const PLATFORM_GUEST_GROUP_PATHS_PLUGIN_KEY = 'platformGuestGroupPaths'

export const PROJECT_ADMIN_GROUP_PATH_SUFFIXES_PLUGIN_KEY = 'projectAdminGroupPathSuffixes'
export const PROJECT_MAINTAINER_GROUP_PATH_SUFFIXES_PLUGIN_KEY = 'projectMaintainerGroupPathSuffixes'
export const PROJECT_DEVELOPER_GROUP_PATH_SUFFIXES_PLUGIN_KEY = 'projectDeveloperGroupPathSuffixes'
export const PROJECT_GUEST_GROUP_PATH_SUFFIXES_PLUGIN_KEY = 'projectGuestGroupPathSuffixes'

export const HARBOR_ROLE_PROJECT_ADMIN = 1
export const HARBOR_ROLE_DEVELOPER = 2
export const HARBOR_ROLE_GUEST = 3
export const HARBOR_ROLE_MAINTAINER = 4
export const HARBOR_ROLE_LIMITED_GUEST = 5
