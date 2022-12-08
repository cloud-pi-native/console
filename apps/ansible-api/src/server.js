import app from './app.js'
import { checkPlaybooksAccess } from './ansible.js'
import { isDev, isTest, isCI, isProd, port } from './utils/env.js'
import { playbooksDictionary } from './utils/matches.js'

startServer()

export async function startServer() {
  try {
    checkPlaybooksAccess(playbooksDictionary)
  } catch (error) {
    app.log.error(error.message)
    throw error
  }

  app.listen({ host: '0.0.0.0', port }, (err, _address) => {
    if (err) {
      app.log.error(err)
      process.exit(1)
    }
  })
  app.log.debug({ isDev, isTest, isCI, isProd })
}
