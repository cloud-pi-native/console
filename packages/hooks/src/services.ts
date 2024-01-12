import { Monitor, MonitorInfos } from '@dso-console/shared'
import type { EnvironmentObject, ClusterObject } from './hooks/index.js'

type ToUrlObject = { to: string, title?: string, description?: string, imgSrc?: string }
type ToServices = Required<ToUrlObject>
type ToUrlFnParamaters = { project: string, organization: string, services: any, clusters: Omit<ClusterObject, 'secretName' | 'kubeConfigId' | 'createdAt' | 'updatedAt'>[], environments: EnvironmentObject[] }
type ToUrlFnResponse = ToUrlObject | ToUrlObject[] | string | void
export type ServiceInfos = {
  name: string
  to?: ({ project, organization, services, clusters, environments }: ToUrlFnParamaters) => ToUrlFnResponse
  monitor?: Monitor
  title: string
  imgSrc?: string
  description?: string
}

export const servicesInfos: Record<string, ServiceInfos> = {}

export const services = {
  getForProject: (projectInfos: ToUrlFnParamaters): ToServices[] => {
    return Object.values(servicesInfos).reduce((acc, serviceInfos) => {
      if (!serviceInfos.to) return acc
      const toResponse = serviceInfos.to(projectInfos)
      if (typeof toResponse === 'string') { // if response is string, assume it's an url and create an ToService Object
        return acc.concat([{
          to: toResponse,
          description: serviceInfos.description ?? '',
          imgSrc: serviceInfos.imgSrc ?? '',
          title: serviceInfos.title ?? '',
        }])
      } // ensure each keys are presents if some are missing, use the properties of the plugin or empty string
      if (toResponse instanceof Object && 'to' in toResponse) {
        return acc.concat([{
          to: toResponse.to,
          description: toResponse.description || serviceInfos.description || '',
          imgSrc: toResponse.imgSrc || serviceInfos.imgSrc || '',
          title: toResponse.title || serviceInfos.title || '',
        }])
      }
      return acc
    }, [] as ToServices[])
  },
  getStatus: (): Array<MonitorInfos & { name: string}> => {
    return Object.values(servicesInfos).reduce((acc, serviceInfos) => {
      if (!serviceInfos?.monitor?.lastStatus) return acc
      return [...acc, { ...serviceInfos.monitor.lastStatus, name: serviceInfos.title }]
    }, [] as Array<MonitorInfos & { name: string}>)
  },
  refreshStatus: (): Array<Promise<MonitorInfos>> => {
    // @ts-ignore sisi je t'assure
    return Object.values(servicesInfos)
      .filter(servicesInfos => servicesInfos.monitor)
      .map(serviceInfos => serviceInfos.monitor?.refresh())
  },
}
