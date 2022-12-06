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
    const { keycloakSubdomain /* appOrigin, keycloakRealm, keycloakDomain */ } = keycloakConf
    // const connect = await fetchJson(`http://${keycloakSubdomain}/token`,
    //   {
    //     method: 'POST',
    //     headers: {
    //       'Content-Type': 'application/x-www-form-urlencoded',
    //     }
    //     body: {

    //     }
    // })

    const resGetToken = await fetchJson(`http://dso-console_keycloak:8080/realms/admin/protocol/openid-connect/token`, //`http://${keycloakSubdomain}/users`, ///${keycloakRealm}`, //`http://${keycloakSubdomain}/users`,
      {
        method: 'POST',
        body: {
          username:'admin',
          password: 'admin',
          grant_type: 'password',
          client_id: 'admin-cli',
        }
      })
    const response = await fetchJson(`http://dso-console_keycloak:8080/admin/realms/cloud-pi-native/users`, //`http://${keycloakSubdomain}/users`, ///${keycloakRealm}`, //`http://${keycloakSubdomain}/users`,
      {
        method: 'GET',
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
