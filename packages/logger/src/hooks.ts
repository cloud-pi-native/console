import type { Logger } from './index.js'
import { logger as baseLogger } from './index.js'

export const logger: Logger = baseLogger.child(
  { scope: 'hooks' },
  {
    redact: {
      paths: [
        'config.auth.username',
        'config.auth.password',
        'config.headers',
        'config.data',
        'request.headers',
        'response.data',
      ],
      remove: true,
    },
  },
)
