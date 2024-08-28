import { systemContract } from '@cpn-console/shared'
import { serverInstance } from '@/app.js'

export function systemRouter() {
  return serverInstance.router(systemContract, {
    getVersion: async () => ({
      status: 200,
      body: {
        version: process.env.APP_VERSION || 'dev',
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
