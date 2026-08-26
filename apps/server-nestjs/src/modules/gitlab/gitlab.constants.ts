// GitLab plugin constants
export const PLUGIN_NAME = 'gitlab'

// Infrastructure integration
export const INFRA_GROUP_NAME = 'Infra'
export const INFRA_GROUP_PATH = 'infra'
export const INFRA_APPS_REPO_NAME = 'infra-apps'
export const MIRROR_REPO_NAME = 'mirror'

// Console-managed plumbing repositories, never a valid mirroring target
export const SPECIAL_REPO_NAMES: string[] = [INFRA_APPS_REPO_NAME, MIRROR_REPO_NAME]

// Custom CI config path applied to user repositories mirroring an external URL
export const GITLAB_CI_CONFIG_PATH = '.gitlab-ci-dso.yml'

// Managed resources sentinel
export const TOPIC_PLUGIN_MANAGED = 'plugin-managed'

// Console-owned plumbing/infra repositories (infra-apps, mirror, observability values...).
// Created in the project subgroup but never listed in project.repositories, so the
// orphan-repo purge must never delete them. Protected via this dedicated topic instead of a
// hardcoded name list, so any plugin can opt its own system repo in by tagging it here.
export const TOPIC_SYSTEM_MANAGED = 'system-managed'
export const TOKEN_DESCRIPTION = 'mirroring-from-external-repo'

// Default group paths for console roles
export const DEFAULT_ADMIN_GROUP_PATH = '/console/admin'
export const DEFAULT_AUDITOR_GROUP_PATH = '/console/readonly,/console/security'
export const DEFAULT_PROJECT_MAINTAINER_GROUP_PATH_SUFFIX = '/console/admin,/console/devops'
export const DEFAULT_PROJECT_DEVELOPER_GROUP_PATH_SUFFIX = '/console/developer'
export const DEFAULT_PROJECT_REPORTER_GROUP_PATH_SUFFIX = '/console/readonly,/console/security'

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
