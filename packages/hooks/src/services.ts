import { Monitor, MonitorInfos, PluginConfig, PluginsUpdateBody } from '@cpn-console/shared'
import type { EnvironmentObject, ClusterObject } from './hooks/index.js'

type ToUrlObject = { to: string, title?: string, description?: string, imgSrc?: string }
export type ToUrlFnParamaters = {
  project: string
  organization: string
  store: PluginsUpdateBody,
  clusters: Omit<ClusterObject, 'secretName' | 'kubeConfigId' | 'createdAt' | 'updatedAt' | 'user' | 'cluster'>[]
  environments: EnvironmentObject[]
}
type ToUrlFnResponse = ToUrlObject | ToUrlObject[] | string | void

export type ServiceInfos = {
  name: string
  to?: ({ project, organization, store, clusters, environments }: ToUrlFnParamaters) => ToUrlFnResponse
  monitor?: Monitor
  title: string
  imgSrc?: string
  description?: string
  config?: PluginConfig
}

export const servicesInfos: Record<string, ServiceInfos> = {}

export const services = {
  getStatus: (): Array<MonitorInfos & { name: string}> => {
    return Object.values(servicesInfos).reduce((acc, serviceInfos) => {
      if (!serviceInfos?.monitor?.lastStatus) return acc
      return [...acc, { ...serviceInfos.monitor.lastStatus, name: serviceInfos.title }]
    }, [] as Array<MonitorInfos & { name: string}>)
  },
  refreshStatus: (): Array<Promise<MonitorInfos>> => {
    // @ts-ignore obligé d'ignore TS ne comprend pas l'interet du filter
    return Object.values(servicesInfos)
      .filter(servicesInfos => servicesInfos.monitor)
      .map(serviceInfos => serviceInfos.monitor?.refresh())
  },
}
