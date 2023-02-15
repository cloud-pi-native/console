import app from '../app.js'
import { createUser } from '../models/queries/user-queries.js'

export default async (users) => {
  app.log.info('Creating users...')
  const usersCreated = users.map(async user => {
    try {
      await createUser(user)
      app.log.info(`User '${user.email}' created !`)
    } catch (err) {
      app.log.error(err)
    }
  })
  return Promise.all(usersCreated)
}
