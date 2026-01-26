import { ADMIN_PERMS, PROJECT_PERMS, adminPermsDetails, projectPermsDetails, systemContract } from '@cpn-console/shared'
import { serverInstance } from '@/app.js'
import { appVersion } from '@/utils/env.js'

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

    getConf: async () => {
      const projectPerms = Object.fromEntries(
        Object.entries(PROJECT_PERMS).map(([k, v]) => [k, v.toString()]),
      )
      const adminPerms = Object.fromEntries(
        Object.entries(ADMIN_PERMS).map(([k, v]) => [k, v.toString()]),
      )
      return {
        status: 200,
        body: {
          projectPermsDetails,
          adminPermsDetails,
          projectPerms,
          adminPerms,
        },
      }
    },
  })
}
