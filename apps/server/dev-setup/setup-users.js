import app from '../src/app.js'
import { createUser } from '../src/models/queries/user-queries.js'
import { users } from 'shared/dev-setup/users.js'

export default async () => {
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
