// Name of the Nexus plugin used throughout the application
export const NEXUS_PLUGIN_NAME = 'nexus'

// Configuration keys for enabling Maven and NPM repositories
export const NEXUS_CONFIG_KEY_ACTIVATE_MAVEN_REPO = 'activateMavenRepo'
export const NEXUS_CONFIG_KEY_ACTIVATE_NPM_REPO = 'activateNpmRepo'

// Configuration keys for Maven snapshot, release, and NPM write policies
export const NEXUS_CONFIG_KEY_MAVEN_SNAPSHOT_WRITE_POLICY = 'mavenSnapshotWritePolicy'
export const NEXUS_CONFIG_KEY_MAVEN_RELEASE_WRITE_POLICY = 'mavenReleaseWritePolicy'
export const NEXUS_CONFIG_KEY_NPM_WRITE_POLICY = 'npmWritePolicy'

// Default write policy values for Maven snapshots, releases, and NPM packages
export const DEFAULT_MAVEN_SNAPSHOT_WRITE_POLICY = 'allow'
export const DEFAULT_MAVEN_RELEASE_WRITE_POLICY = 'allow_once'
export const DEFAULT_NPM_WRITE_POLICY = 'allow'

// Default group paths granting write and read access at the platform level
export const DEFAULT_PLATFORM_WRITE_GROUP_PATHS = '/console/admin'
export const DEFAULT_PLATFORM_READ_GROUP_PATHS = '/console/readonly,/console/security'

// Default group path suffixes granting write and read access at the project level
export const DEFAULT_PROJECT_WRITE_GROUP_PATH_SUFFIXES = '/console/admin,/console/devops,/console/developer'
export const DEFAULT_PROJECT_READ_GROUP_PATH_SUFFIXES = '/console/readonly,/console/security'

// Plugin configuration keys for platform-level group paths
export const PLATFORM_WRITE_GROUP_PATHS_PLUGIN_KEY = 'platformWriteGroupPaths'
export const PLATFORM_READ_GROUP_PATHS_PLUGIN_KEY = 'platformReadGroupPaths'

// Plugin configuration keys for project-level group path suffixes
export const PROJECT_WRITE_GROUP_PATH_SUFFIXES_PLUGIN_KEY = 'projectWriteGroupPathSuffixes'
export const PROJECT_READ_GROUP_PATH_SUFFIXES_PLUGIN_KEY = 'projectReadGroupPathSuffixes'
