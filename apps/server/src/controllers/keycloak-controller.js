import app from '../app.js'
import { getLogInfos } from '../utils/logger.js'
import { send201, send500 } from '../utils/response.js'
import { fetchJson } from '../utils/fetch-utils.js'
import { keycloakConf } from '../utils/keycloak.js'

export const getUsersKeyCloakController = async (req, res) => {
  console.log('Test')
  app.log.info({
    ...getLogInfos({ keycloakConf }),
    description: 'keycloack getUsersKeyCloakController',
  })

  try {
    const { keycloakSubdomain, keycloakDomain, keycloakRealm /* appOrigin, keycloakRealm,  */ } = keycloakConf
    const resGetToken = await fetchJson(
        // 'http://localhost:8090/realms/cloud-pi-native/protocol/openid-connect/token'
        // `http://dso-console_keycloak:8080/realms/cloud-pi-native/protocol/openid-connect/token`,
        `http://${keycloakSubdomain}/protocol/openid-connect/token`,
        {
          method: 'POST',
          body: {
            client_id: 'admin-cli',
            username: 'admin',
            password: 'admin',
            grant_type: 'password',

          },
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        })

    const response = await fetchJson(
      // `http://localhost:8090/admin/realms/cloud-pi-native/users`,
      //  `http://dso-console_keycloak:8080/admin/realms/cloud-pi-native/users`,
      `http://${keycloakDomain}/admin/realms/${keycloakRealm}/users`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${resGetToken.access_token}`,
        },
      })
    console.log(response)
    app.log.info({
      ...getLogInfos({ response }),
      description: 'keycloack getUsersKeyCloakController',
    })

    send201(res, response)
  } catch (error) {
    console.log(error)
    app.log.error({
      ...getLogInfos(keycloakConf),
      description: 'keycloack getUsersKeyCloakController failed',
      error,
      message: error.message,
    })
    send500(res, JSON.stringify(error.message))
  }
}
