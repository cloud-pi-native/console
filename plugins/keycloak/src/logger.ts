import type { Logger } from '@cpn-console/logger'
import { logger as baseLogger } from '@cpn-console/logger'

export const logger: Logger = baseLogger.child(
  { plugin: 'keycloak' },
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
