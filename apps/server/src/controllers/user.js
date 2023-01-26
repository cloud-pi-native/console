import { createUser } from '../models/queries/user-queries.js'
import { getLogInfos } from '../utils/logger.js'
import { send201, send500 } from '../utils/response.js'

// GET
// TODO : conditionner possibilité de récupérer tous les utilisateurs selon les droits de l'utilisateur
// export const getUsersController = async (req, res) => {
//   try {
//     const users = await getUsers()
//     req.log.info({
//       ...getLogInfos(),
//       description: 'Users successfully retreived',
//     })
//     await send200(res, users)
//   } catch (error) {
//     const message = 'Cannot retrieve users'
//     req.log.error({
//       ...getLogInfos(),
//       description: message,
//       error: error.message,
//     })
//     send500(res, message)
//   }
// }

// CREATE
export const createUserController = async (req, res) => {
  const data = req.body

  try {
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
