import app from './app.js'
import { isDev, isTest, isCI, isProd, port } from './utils/env.js'

await startServer()

export async function startServer () {
  app.listen({ host: '0.0.0.0', port }, (err, _address) => {
    if (err) {
      app.log.error(err)
      process.exit(1)
    }
  })
  app.log.debug({ isDev, isTest, isCI, isProd })
}
