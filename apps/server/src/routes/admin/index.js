import userRouter from './user.js'
import organizationRouter from './organization.js'
import logRouter from './log.js'

const router = async (app, _opt) => {
  // Enregistrement du sous routeur user
  await app.register(userRouter, { prefix: '/users' })

  // Enregistrement du sous routeur organization
  await app.register(organizationRouter, { prefix: '/organizations' })

  // Enregistrement du sous routeur logd
  await app.register(logRouter, { prefix: '/log' })
}

export default router
