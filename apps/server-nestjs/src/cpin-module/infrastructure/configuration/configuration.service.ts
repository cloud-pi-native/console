import { Injectable } from '@nestjs/common';

@Injectable()
export class ConfigurationService {
    // application mode
    isDev = process.env.NODE_ENV === 'development';
    isTest = process.env.NODE_ENV === 'test';
    isProd = process.env.NODE_ENV === 'production';
    isInt = process.env.INTEGRATION === 'true';
    isCI = process.env.CI === 'true';
    isDevSetup = process.env.DEV_SETUP === 'true';

    // app
    port = process.env.SERVER_PORT;
    appVersion = this.isProd ? (process.env.APP_VERSION ?? 'unknown') : 'dev';

    // db
    dbUrl = process.env.DB_URL;

    // keycloak
    sessionSecret = process.env.SESSION_SECRET;
    keycloakProtocol = process.env.KEYCLOAK_PROTOCOL;
    keycloakDomain = process.env.KEYCLOAK_DOMAIN;
    keycloakRealm = process.env.KEYCLOAK_REALM;
    keycloakClientId = process.env.KEYCLOAK_CLIENT_ID;
    keycloakClientSecret = process.env.KEYCLOAK_CLIENT_SECRET;
    keycloakRedirectUri = process.env.KEYCLOAK_REDIRECT_URI;
    adminsUserId = process.env.ADMIN_KC_USER_ID
        ? process.env.ADMIN_KC_USER_ID.split(',')
        : [];

    contactEmail =
        process.env.CONTACT_EMAIL ??
        'cloudpinative-relations@interieur.gouv.fr';

    // plugins
    mockPlugins = process.env.MOCK_PLUGINS === 'true';
    projectRootDir = process.env.PROJECTS_ROOT_DIR;
    pluginsDir = process.env.PLUGINS_DIR ?? '/plugins';
    NODE_ENV =
        process.env.NODE_ENV === 'test'
            ? 'test'
            : process.env.NODE_ENV === 'development'
              ? 'development'
              : 'production';

}
