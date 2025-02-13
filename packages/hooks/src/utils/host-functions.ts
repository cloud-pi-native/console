import type { Config } from '@/hooks/hook.js'
import type { ClusterObject } from '@/hooks/index.js'
import type { ProjectV2 } from '@cpn-console/shared'

export interface HostFunctions {
  getProjectsStatus: (idOrSlugs: string[]) => Promise<Array<{ id: string, slug: string, status: ProjectV2['status'] }>>
  getClusters: () => Promise<ClusterObject[]>
  updateReport: (pluginName: string, report: string) => Promise<void>
  getPluginConfig: (pluginName: string) => Promise<Config>
}

export const hostFunctions: HostFunctions = {
  getClusters: () => { throw new Error('Function not yet init') },
  getProjectsStatus: () => { throw new Error('Function not yet init') },
  updateReport: () => { throw new Error('Function not yet init') },
  getPluginConfig: () => { throw new Error('Function not yet init') },
}

export function populateHostFunctions(hFns: HostFunctions) {
  hostFunctions.getClusters = hFns.getClusters
  hostFunctions.getProjectsStatus = hFns.getProjectsStatus
  hostFunctions.updateReport = hFns.updateReport
  hostFunctions.getPluginConfig = hFns.getPluginConfig
}
