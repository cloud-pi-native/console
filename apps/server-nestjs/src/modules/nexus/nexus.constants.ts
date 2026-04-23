export const NEXUS_PLUGIN_NAME = 'nexus'

export const NEXUS_CONFIG_KEY_ACTIVATE_MAVEN_REPO = 'activateMavenRepo'
export const NEXUS_CONFIG_KEY_ACTIVATE_NPM_REPO = 'activateNpmRepo'
export const NEXUS_CONFIG_KEY_MAVEN_SNAPSHOT_WRITE_POLICY = 'mavenSnapshotWritePolicy'
export const NEXUS_CONFIG_KEY_MAVEN_RELEASE_WRITE_POLICY = 'mavenReleaseWritePolicy'
export const NEXUS_CONFIG_KEY_NPM_WRITE_POLICY = 'npmWritePolicy'

export const DEFAULT_MAVEN_SNAPSHOT_WRITE_POLICY = 'allow'
export const DEFAULT_MAVEN_RELEASE_WRITE_POLICY = 'allow_once'
export const DEFAULT_NPM_WRITE_POLICY = 'allow'

export const DEFAULT_PLATFORM_WRITE_GROUP_PATHS = '/console/admin'
export const DEFAULT_PLATFORM_READ_GROUP_PATHS = '/console/readonly,/console/security'

export const DEFAULT_PROJECT_WRITE_GROUP_PATH_SUFFIXES = '/console/admin,/console/devops,/console/developer'
export const DEFAULT_PROJECT_READ_GROUP_PATH_SUFFIXES = '/console/readonly,/console/security'

export const DEFAULT_PLATFORM_ADMIN_GROUP_PATH = '/console/admin'
export const DEFAULT_PLATFORM_READONLY_GROUP_PATH = '/console/readonly'
export const DEFAULT_PLATFORM_SECURITY_GROUP_PATH = '/console/security'

export const PLATFORM_ADMIN_GROUP_PATH_PLUGIN_KEY = 'platformAdminGroupPath'
export const PLATFORM_READONLY_GROUP_PATH_PLUGIN_KEY = 'platformReadonlyGroupPath'
export const PLATFORM_SECURITY_GROUP_PATH_PLUGIN_KEY = 'platformSecurityGroupPath'

export const PLATFORM_WRITE_GROUP_PATHS_PLUGIN_KEY = 'platformWriteGroupPaths'
export const PLATFORM_READ_GROUP_PATHS_PLUGIN_KEY = 'platformReadGroupPaths'

export const PROJECT_WRITE_GROUP_PATH_SUFFIXES_PLUGIN_KEY = 'projectWriteGroupPathSuffixes'
export const PROJECT_READ_GROUP_PATH_SUFFIXES_PLUGIN_KEY = 'projectReadGroupPathSuffixes'
