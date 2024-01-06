import { Cluster, Environment } from '@prisma/client'

type ToUrlObject = { url: string, title?: string, description?: string, imgSrc?: string }
type ToServices = Required<ToUrlObject>
type ToUrlFnParamaters = { project: string, organization: string, services: any, clusters: Omit<Cluster, 'secretName' | 'kubeConfigId' | 'createdAt' | 'updatedAt'>[], environments: Environment[] }
type ToUrlFnResponse = ToUrlObject | ToUrlObject[] | string
export type ServiceInfos = {
  name: string
  to?: ({ project, organization, services, clusters, environments }: ToUrlFnParamaters) => ToUrlFnResponse
  monitorUrl?: string
  title: string
  imgSrc?: string
  description?: string
}

export const servicesInfos: Record<string, ServiceInfos> = {}

export const getProjectServices = (projectInfos: ToUrlFnParamaters): ToServices[] => {
  return Object.values(servicesInfos) // get services registered
    .filter(serviceInfos => serviceInfos.to) // select only those with a `to` function
    .map(serviceInfos => { // key of service in servicesInfos, its values
      return [serviceInfos.to(projectInfos)] // call plugin to function, stores it in array
        .flat() // flat it in case its response was an array
        .map((toResponse) => { // ensure each keys are presents if some are missing, use the properties of the plugin or empty string
          return typeof toResponse === 'string'
            ? {
                url: toResponse,
                description: serviceInfos.description ?? '',
                imgSrc: serviceInfos.imgSrc ?? '',
                title: serviceInfos.title ?? '',
              }
            : {
                ...toResponse,
                ...!toResponse.description && { description: serviceInfos.description ?? '' },
                ...!toResponse.imgSrc && { imgSrc: serviceInfos.imgSrc ?? '' },
                ...!toResponse.title && { title: serviceInfos.title ?? '' },
              }
        })
    }).flat()
}
