import {
  getUser,
  createUser,
} from '../models/users-queries.js'
import { getLogInfos } from '../utils/logger.js'
import { send200, send201, send500 } from '../utils/response.js'

// GET

export const getUsersController = async (req, res) => {
  try {
  // TODO : besoin d'un contrôle ici (user session ?)
    const organizations = await getUser()
    req.log.info({
      ...getLogInfos(),
      description: 'Organizations successfully retreived',
    })
    await send200(res, organizations)
  } catch (error) {
    const message = 'Cannot retrieve organizations'
    req.log.error({
      ...getLogInfos(),
      description: message,
      error: error.message,
    })
    send500(res, message)
  }
}

// CREATE
export const createUserController = async (req, res) => {
  const data = req.body

  try {
    // TODO : ce controller sera-t-il utilisé (tous les users viennent de Keycloak) ?
    const user = await createUser(data)
    req.log.info({
      ...getLogInfos({
        userId: user.id,
      }),
      description: 'User successfully created in database',
    })
    send201(res, user)
  } catch (error) {
    req.log.error({
      ...getLogInfos(),
      description: 'Cannot create user',
      error: error.message,
    })
    return send500(res, error.message)
  }
}
