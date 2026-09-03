export const PLUGIN_NAME = 'sonarqube'
export const DEFAULT_PERMISSION_TEMPLATE_NAME = 'Forge Default'

// SonarQube search API page size (server caps `ps` at 500)
export const SONARQUBE_PAGE_SIZE = 100
// Defensive upper bound on fetched pages (page size 100 -> 100k items) to stop a misbehaving endpoint from looping forever
export const SONARQUBE_MAX_PAGES = 1000

// SonarQube global permission names
export const GLOBAL_ADMIN_PERMISSIONS = ['admin', 'profileadmin', 'gateadmin', 'scan', 'provisioning'] as const

// Permission template — grants to project creator and sonar-administrators on new projects
export const DEFAULT_TEMPLATE_PERMISSIONS = ['admin', 'codeviewer', 'issueadmin', 'securityhotspotadmin', 'scan', 'user'] as const

// Project-level permission sets per role (SonarQube permission API names)
export const PROJECT_ADMIN_PERMISSIONS = ['admin', 'scan', 'user', 'codeviewer', 'issueadmin', 'securityhotspotadmin'] as const
export const PROJECT_DEVOPS_PERMISSIONS = ['scan', 'user', 'codeviewer', 'issueadmin', 'securityhotspotadmin'] as const
export const PROJECT_DEVELOPER_PERMISSIONS = ['scan', 'user', 'codeviewer', 'issueadmin', 'securityhotspotadmin'] as const
export const PROJECT_SECURITY_PERMISSIONS = ['scan', 'user', 'codeviewer', 'issueadmin', 'securityhotspotadmin'] as const
export const PROJECT_READER_PERMISSIONS = ['user', 'codeviewer'] as const

// CI robot/service account — needs Execute Analysis + Browse + See Source Code
export const ROBOT_PROJECT_PERMISSIONS = ['scan', 'user', 'codeviewer'] as const

// Default platform-wide Keycloak group paths
export const DEFAULT_ADMIN_GROUP_PATH = '/console/admin'
export const DEFAULT_READER_GROUP_PATH = '/console/reader'
export const DEFAULT_SECURITY_GROUP_PATH = '/console/security'

// Default project role group path suffixes (appended to /{projectSlug})
export const DEFAULT_PROJECT_ADMIN_SUFFIX = '/console/admin'
export const DEFAULT_PROJECT_DEVOPS_SUFFIX = '/console/devops'
export const DEFAULT_PROJECT_DEVELOPER_SUFFIX = '/console/developer'
export const DEFAULT_PROJECT_SECURITY_SUFFIX = '/console/security'
export const DEFAULT_PROJECT_READER_SUFFIX = '/console/reader'

// Admin plugin config keys for overriding defaults
export const ADMIN_GROUP_PATH_PLUGIN_KEY = 'adminGroupPath'
export const READER_GROUP_PATH_PLUGIN_KEY = 'readerGroupPath'
export const SECURITY_GROUP_PATH_PLUGIN_KEY = 'securityGroupPath'
export const PROJECT_ADMIN_SUFFIX_PLUGIN_KEY = 'projectAdminSuffix'
export const PROJECT_DEVOPS_SUFFIX_PLUGIN_KEY = 'projectDevopsSuffix'
export const PROJECT_DEVELOPER_SUFFIX_PLUGIN_KEY = 'projectDeveloperSuffix'
export const PROJECT_SECURITY_SUFFIX_PLUGIN_KEY = 'projectSecuritySuffix'
export const PROJECT_READER_SUFFIX_PLUGIN_KEY = 'projectReaderSuffix'

// SonarQube project qualifier identifiers
export const SONARQUBE_PROJECT_QUALIFIER_APPLICATION = 'APP'
export const SONARQUBE_PROJECT_QUALIFIER_BRANCH = 'BRC'
export const SONARQUBE_PROJECT_QUALIFIER_DIRECTORY = 'DIR'
export const SONARQUBE_PROJECT_QUALIFIER_FILE = 'FIL'
export const SONARQUBE_PROJECT_QUALIFIER_LIBRARY = 'LIB'
export const SONARQUBE_PROJECT_QUALIFIER_PROJECT = 'TRK'
export const SONARQUBE_PROJECT_QUALIFIER_SUB_VIEW = 'SVW'
export const SONARQUBE_PROJECT_QUALIFIER_UNIT_TEST = 'UTS'
export const SONARQUBE_PROJECT_QUALIFIER_VIEW = 'VW'
