import type { Logger } from './index.js'
import { logger as baseLogger } from './index.js'

export const logger: Logger = baseLogger.child(
  { scope: 'hooks' },
  {
    redact: {
      paths: [
        'err.config.auth.username',
        'err.config.auth.password',
        'err.config.headers',
        'err.config.data',
        'err.config.params.client_secret',
        'err.config.params.clientSecret',
        'err.request.headers',
        'err.response.data',
        'err.response.headers',
      ],
      remove: true,
    },
  },
)
