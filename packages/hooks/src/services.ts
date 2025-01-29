import type { Monitor, MonitorInfos, PluginConfig, PluginsUpdateBody } from '@cpn-console/shared'
import type { ClusterObject, EnvironmentObject, ProjectLite, ZoneObject } from './hooks/index.js'

interface ToUrlObject { to: string, title?: string, description?: string, imgSrc?: string }
export interface ToUrlFnParamaters {
  store: PluginsUpdateBody
  clusters: Omit<ClusterObject, 'secretName' | 'kubeConfigId' | 'createdAt' | 'updatedAt' | 'user' | 'cluster'>[]
  zones: ZoneObject[]
  environments: EnvironmentObject[]
  project: Omit<ProjectLite, 'store'>
}
type ToUrlFnResponse = ToUrlObject | ToUrlObject[] | string | void

export interface ServiceInfos {
  name: string
  to?: ({ store, clusters, zones, environments, project }: ToUrlFnParamaters) => ToUrlFnResponse
  monitor?: Monitor
  title: string
  imgSrc?: string
  description?: string
  config?: PluginConfig
}

export const servicesInfos: Record<string, ServiceInfos> = {}

export type ServiceStatus = MonitorInfos & { name: string }
export const services = {
  getStatus: (): Array<ServiceStatus> => {
    return Object.values(servicesInfos).reduce((acc, serviceInfos) => {
      if (!serviceInfos?.monitor?.lastStatus) return acc
      return [...acc, { ...serviceInfos.monitor.lastStatus, name: serviceInfos.title }]
    }, [] as Array<ServiceStatus>)
  },
  refreshStatus: (): Array<Promise<MonitorInfos>> => {
    // @ts-ignore obligé d'ignore TS ne comprend pas l'interet du filter
    return Object.values(servicesInfos)
      .filter(servicesInfos => servicesInfos.monitor)
      .map(serviceInfos => serviceInfos.monitor?.refresh())
  },
}
