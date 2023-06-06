import { adminGroupPath } from 'shared/src/utils/const.js'
import { sendForbidden } from './response.js'

export const checkAdminGroup = (req, res, done) => {
  if (!req.session.user.groups?.includes(adminGroupPath)) {
    sendForbidden(res, 'Vous n\'avez pas les droits administrateur')
  }
  done()
}
