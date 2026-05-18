export const SONARQUBE_PLUGIN_NAME = 'sonarqube'
export const DEFAULT_PERMISSION_TEMPLATE_NAME = 'Forge Default'

// SonarQube global permission names
export const GLOBAL_ADMIN_PERMISSIONS = ['admin', 'profileadmin', 'gateadmin', 'provisioning'] as const

// Permission template — grants to project creator and sonar-administrators on new projects
export const DEFAULT_TEMPLATE_PERMISSIONS = ['admin', 'codeviewer', 'issueadmin', 'securityhotspotadmin', 'scan', 'user'] as const

// Project-level permission sets per role (SonarQube permission API names)
export const PROJECT_ADMIN_PERMISSIONS = ['admin', 'scan', 'user', 'codeviewer', 'issueadmin', 'securityhotspotadmin'] as const
export const PROJECT_DEVOPS_PERMISSIONS = ['scan', 'user', 'codeviewer', 'issueadmin', 'securityhotspotadmin'] as const
export const PROJECT_DEVELOPER_PERMISSIONS = ['scan', 'user', 'codeviewer'] as const
export const PROJECT_SECURITY_PERMISSIONS = ['scan', 'user', 'codeviewer', 'issueadmin', 'securityhotspotadmin'] as const
export const PROJECT_READONLY_PERMISSIONS = ['user', 'codeviewer'] as const

// CI robot/service account — needs Execute Analysis + Browse + See Source Code
export const ROBOT_PROJECT_PERMISSIONS = ['scan', 'user', 'codeviewer'] as const

// Default platform-wide Keycloak group paths (following gitlab /console/* naming)
export const DEFAULT_ADMIN_GROUP_PATH = '/console/admin'
export const DEFAULT_READONLY_GROUP_PATH = '/console/readonly'
export const DEFAULT_SECURITY_GROUP_PATH = '/console/security'

// Default project role group path suffixes (appended to /{projectSlug})
export const DEFAULT_PROJECT_ADMIN_SUFFIX = '/console/admin'
export const DEFAULT_PROJECT_DEVOPS_SUFFIX = '/console/devops'
export const DEFAULT_PROJECT_DEVELOPER_SUFFIX = '/console/developer'
export const DEFAULT_PROJECT_SECURITY_SUFFIX = '/console/security'
export const DEFAULT_PROJECT_READONLY_SUFFIX = '/console/readonly'

// Admin plugin config keys for overriding defaults
export const ADMIN_GROUP_PATH_PLUGIN_KEY = 'adminGroupPath'
export const READONLY_GROUP_PATH_PLUGIN_KEY = 'readonlyGroupPath'
export const SECURITY_GROUP_PATH_PLUGIN_KEY = 'securityGroupPath'
export const PROJECT_ADMIN_SUFFIX_PLUGIN_KEY = 'projectAdminSuffix'
export const PROJECT_DEVOPS_SUFFIX_PLUGIN_KEY = 'projectDevopsSuffix'
export const PROJECT_DEVELOPER_SUFFIX_PLUGIN_KEY = 'projectDeveloperSuffix'
export const PROJECT_SECURITY_SUFFIX_PLUGIN_KEY = 'projectSecuritySuffix'
export const PROJECT_READONLY_SUFFIX_PLUGIN_KEY = 'projectReadonlySuffix'
