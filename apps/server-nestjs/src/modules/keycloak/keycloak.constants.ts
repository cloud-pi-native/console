// Keycloak plugin constants
export const PLUGIN_NAME = 'keycloak'

// Name for the console group for admin and project roles
export const CONSOLE_GROUP_NAME = 'console'

// Realm hosting the admin user used by the admin client (password grant on admin-cli)
export const ADMIN_AUTH_REALM = 'master'

// OAuth2 grant types (RFC 6749) used to authenticate the admin client
export const PASSWORD_GRANT_TYPE = 'password'
export const REFRESH_TOKEN_GRANT_TYPE = 'refresh_token'

// Keycloak's default access token lifespan is 60s; refresh well before it
// expires so a slow or delayed tick still lands within the lifespan
export const ADMIN_TOKEN_REFRESH_INTERVAL_MS = 45_000

// Maximum number of entities returned in a paginated query
export const GROUPS_PAGINATE_QUERY_MAX = 20
export const SUBGROUPS_PAGINATE_QUERY_MAX = 20

// Plugin synchronization flags (shared plugin config keys)
export const AUTO_SYNC_PLUGIN_KEY = 'autoSync'
export const SUSPENDED_PLUGIN_KEY = 'suspended'
