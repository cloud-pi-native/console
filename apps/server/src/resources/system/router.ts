import { systemContract } from '@cpn-console/shared'
import { serverInstance } from '@/app.js'

export const systemRouter = () => serverInstance.router(systemContract, {
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
