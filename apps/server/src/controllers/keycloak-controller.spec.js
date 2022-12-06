import { describe, expect, it, vi } from 'vitest';
import app, { apiPrefix } from '../app.js';
import { keycloakConf }  from '../utils/keycloak.js'

vi.mock('../utils/keycloak.js', () => ({
  keycloakConf: {
        appOrigin: `http://localhost:8090`,
        keycloakSubdomain: 'localhost:8090/realms/cloud-pi-native',
        clientId: "dso-console-backend",
        clientSecret: "client-secret-backend",
        useHttps: false,
        disableCookiePlugin: true,
        disableSessionPlugin: true,
        retries: 5,
        keycloakRealm: 'cloud-pi-native',
        keycloakDomain: 'localhost:8090',
  },
  sessionConf: {
    cookieName: 'sessionId',
    secret: 'a-very-strong-secret-with-more-than-32-char',
    cookie: {
      httpOnly: true,
      secure: true,
    },
    expires: 1800000,
  }
}))
// const mockkeycloadConf = vi.mocked(keycloakConf)
//   , () => {
//   return {
//   appOrigin: `http://localhost:8080`,
//   keycloakSubdomain: 'http://localhost:8090', //`${keycloakDomain}/realms/${keycloakRealm}`,
//   clientId: keycloakClientId,
//   clientSecret: keycloakClientSecret,
//   useHttps: keycloakProtocol === 'https',
//   disableCookiePlugin: true,
//   disableSessionPlugin: true,
//   userPayloadMapper,
//   retries: 5,
//   keycloakRealm,
//   keycloakDomain,
// }
// })
describe.skip('keycloak controller', () => {
  
  
  it('get users from keycloak', async () => {
       // vi.spyOn(keycloakConfigure, "keycloakConf").mockReturnValue(
    //   {
    //     appOrigin: `http://localhost:8080`,
    //     keycloakSubdomain: 'http://localhost:8090',
    //     clientId: keycloakClientId,
    //     clientSecret: keycloakClientSecret,
    //     useHttps: keycloakProtocol === 'https',
    //     disableCookiePlugin: true,
    //     disableSessionPlugin: true,
    //     userPayloadMapper,
    //     retries: 5,
    //     keycloakRealm,
    //     keycloakDomain,
    //   }
    // )
    const response = await app.inject()
      // .get(`${apiPrefix}/version`)
      .get(`${apiPrefix}/keycloakinfo`)
      .end()
    console.log({ body: response.body})

    expect(response.body).toBeDefined()
    // expect(response.body).toBe('version')

  })
})