import type { Logger } from '@cpn-console/logger'
import { logger as baseLogger } from '@cpn-console/logger'

export const logger: Logger = baseLogger.child({ plugin: 'keycloak' })
