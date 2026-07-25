import type { User } from '@cpn-console/test-utils'
import fp from 'fastify-plugin'

let requestor: User

export function setRequestor(user: User) {
  requestor = user
}

export function getRequestor() {
  return requestor
}

export async function mockSessionPlugin() {
  const sessionPlugin = (app, opt, next) => {
    app.addHook('onRequest', (req, res, next) => {
      req.session = { user: getRequestor() }
      next()
    })
    next()
  }

  return { default: fp(sessionPlugin) }
}
