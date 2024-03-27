import fp from 'fastify-plugin'
import { User } from '@cpn-console/test-utils'

let requestor: User

export const setRequestor = (user: User) => {
  requestor = user
}

export const getRequestor = () => {
  return requestor
}

export const mockSessionPlugin = async () => {
  const sessionPlugin = (app, opt, next) => {
    app.addHook('onRequest', (req, res, next) => {
      req.session = { user: getRequestor() }
      next()
    })
    next()
  }

  return { default: fp(sessionPlugin) }
}
