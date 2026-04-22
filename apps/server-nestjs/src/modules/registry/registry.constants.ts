export const REGISTRY_PLUGIN_NAME = 'harbor'

export const REGISTRY_CONFIG_KEY_QUOTA_HARD_LIMIT = 'quotaHardLimit'
export const REGISTRY_CONFIG_KEY_PUBLISH_PROJECT_ROBOT = 'publishProjectRobot'

export const DEFAULT_PLATFORM_ADMIN_GROUP_PATH = '/console/admin'
export const DEFAULT_PLATFORM_READONLY_GROUP_PATH = '/console/readonly'
export const DEFAULT_PLATFORM_SECURITY_GROUP_PATH = '/console/security'

export const DEFAULT_PLATFORM_PROJECT_ADMIN_GROUP_PATH = '/console/admin'
export const DEFAULT_PLATFORM_GUEST_GROUP_PATHS = '/console/readonly,/console/security'

export const DEFAULT_PROJECT_PROJECT_ADMIN_GROUP_PATH_SUFFIXES = '/console/admin'
export const DEFAULT_PROJECT_MAINTAINER_GROUP_PATH_SUFFIXES = '/console/devops'
export const DEFAULT_PROJECT_DEVELOPER_GROUP_PATH_SUFFIXES = '/console/developer'
export const DEFAULT_PROJECT_GUEST_GROUP_PATH_SUFFIXES = '/console/readonly,/console/security'

export const PLATFORM_ADMIN_GROUP_PATH_PLUGIN_KEY = 'platformAdminGroupPath'
export const PLATFORM_READONLY_GROUP_PATH_PLUGIN_KEY = 'platformReadonlyGroupPath'
export const PLATFORM_SECURITY_GROUP_PATH_PLUGIN_KEY = 'platformSecurityGroupPath'

export const PLATFORM_PROJECT_ADMIN_GROUP_PATH_PLUGIN_KEY = 'platformProjectAdminGroupPath'
export const PLATFORM_GUEST_GROUP_PATHS_PLUGIN_KEY = 'platformGuestGroupPaths'

export const PROJECT_PROJECT_ADMIN_GROUP_PATH_SUFFIXES_PLUGIN_KEY = 'projectProjectAdminGroupPathSuffixes'
export const PROJECT_MAINTAINER_GROUP_PATH_SUFFIXES_PLUGIN_KEY = 'projectMaintainerGroupPathSuffixes'
export const PROJECT_DEVELOPER_GROUP_PATH_SUFFIXES_PLUGIN_KEY = 'projectDeveloperGroupPathSuffixes'
export const PROJECT_GUEST_GROUP_PATH_SUFFIXES_PLUGIN_KEY = 'projectGuestGroupPathSuffixes'

export const DEFAULT_PROJECT_ADMIN_GROUP_PATH_SUFFIX = DEFAULT_PROJECT_PROJECT_ADMIN_GROUP_PATH_SUFFIXES
export const DEFAULT_PROJECT_DEVOPS_GROUP_PATH_SUFFIX = DEFAULT_PROJECT_MAINTAINER_GROUP_PATH_SUFFIXES
export const DEFAULT_PROJECT_DEVELOPER_GROUP_PATH_SUFFIX = DEFAULT_PROJECT_DEVELOPER_GROUP_PATH_SUFFIXES
export const DEFAULT_PROJECT_READONLY_GROUP_PATH_SUFFIX = '/console/readonly'
export const DEFAULT_PROJECT_SECURITY_GROUP_PATH_SUFFIX = '/console/security'

export const PROJECT_ADMIN_GROUP_PATH_SUFFIX_PLUGIN_KEY = 'projectAdminGroupPathSuffix'
export const PROJECT_DEVOPS_GROUP_PATH_SUFFIX_PLUGIN_KEY = 'projectDevopsGroupPathSuffix'
export const PROJECT_DEVELOPER_GROUP_PATH_SUFFIX_PLUGIN_KEY = 'projectDeveloperGroupPathSuffix'
export const PROJECT_READONLY_GROUP_PATH_SUFFIX_PLUGIN_KEY = 'projectReadonlyGroupPathSuffix'
export const PROJECT_SECURITY_GROUP_PATH_SUFFIX_PLUGIN_KEY = 'projectSecurityGroupPathSuffix'

export const HARBOR_ROLE_PROJECT_ADMIN = 1
export const HARBOR_ROLE_DEVELOPER = 2
export const HARBOR_ROLE_GUEST = 3
export const HARBOR_ROLE_MAINTAINER = 4
export const HARBOR_ROLE_LIMITED_GUEST = 5
