// ArgoCD infrastructure automation
export const INFRA_GROUP_NAME = 'Infra'
export const INFRA_GROUP_PATH = 'infra'
export const INFRA_APPS_REPO_NAME = 'infra-apps'
export const MIRROR_REPO_NAME = 'mirror'

// Managed resources sentinel
export const TOPIC_PLUGIN_MANAGED = 'plugin-managed'
export const TOKEN_DESCRIPTION = 'mirroring-from-external-repo'

// Default group paths for console roles
export const DEFAULT_ADMIN_GROUP_PATH = '/console/admin'
export const DEFAULT_AUDITOR_GROUP_PATH = '/console/readonly'
export const DEFAULT_PROJECT_MAINTAINER_GROUP_PATH_SUFFIX = '/console/admin'
export const DEFAULT_PROJECT_DEVELOPER_GROUP_PATH_SUFFIX = '/console/developer,/console/devops'
export const DEFAULT_PROJECT_REPORTER_GROUP_PATH_SUFFIX = '/console/readonly'

// Plugin configuration keys
export const ADMIN_GROUP_PATH_PLUGIN_KEY = 'adminGroupPath'
export const AUDITOR_GROUP_PATH_PLUGIN_KEY = 'auditorGroupPath'
export const PROJECT_REPORTER_GROUP_PATH_SUFFIX_PLUGIN_KEY = 'projectReporterGroupPathSuffix'
export const PROJECT_DEVELOPER_GROUP_PATH_SUFFIX_PLUGIN_KEY = 'projectDeveloperGroupPathSuffix'
export const PROJECT_MAINTAINER_GROUP_PATH_SUFFIX_PLUGIN_KEY = 'projectMaintainerGroupPathSuffix'
export const PURGE_PLUGIN_KEY = 'purge'

// Custom attribute keys used in GitLab groups
export const GROUP_ROOT_CUSTOM_ATTRIBUTE_KEY = 'cpn_projects_root_dir'
export const INFRA_GROUP_CUSTOM_ATTRIBUTE_KEY = 'cpn_infra_group'
export const PROJECT_GROUP_CUSTOM_ATTRIBUTE_KEY = 'cpn_project_slug'
export const USER_ID_CUSTOM_ATTRIBUTE_KEY = 'cpn_user_id'
export const MANAGED_BY_CONSOLE_CUSTOM_ATTRIBUTE_KEY = 'cpn_managed_by_console'
