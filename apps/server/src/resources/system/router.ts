import { systemContract } from '@cpn-console/shared'
import { serverInstance } from '@/app'
import { appVersion } from '@/utils/env'

export function systemRouter() {
  return serverInstance.router(systemContract, {
    getVersion: async () => ({
      status: 200,
      body: {
        version: appVersion,
      },
    }),

    getHealth: async () => ({
      status: 200,
      body: {
        status: 'OK',
      },
    }),
  })
}
