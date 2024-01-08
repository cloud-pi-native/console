import { Cluster, Environment, QuotaStage, Stage } from '@prisma/client'

type ToUrlObject = { to: string, title?: string, description?: string, imgSrc?: string }
type ToServices = Required<ToUrlObject>
type ToUrlFnProject = {
  project: string,
  organization: string,
  services: any,
  clusters: Omit<Cluster, 'secretName' | 'kubeConfigId' | 'createdAt' | 'updatedAt'>[]
  environments: Array<Environment & { quotaStage: QuotaStage & { stage: Stage } }>
}
type ToUrlFnResponse = ToUrlObject | ToUrlObject[] | string | void
export type ServiceInfos = {
  name: string
  to?: ({ project, organization, services, clusters, environments }: ToUrlFnProject) => ToUrlFnResponse
  monitorUrl?: string
  title: string
  imgSrc?: string
  description?: string
}

export const servicesInfos: Record<string, ServiceInfos> = {}

export const getProjectServices = (projectInfos: ToUrlFnProject): ToServices[] => {
  return Object.values(servicesInfos) // get services registered
    .filter(serviceInfos => serviceInfos.to) // select only those with a `to` function
    .map(serviceInfos => { // key of service in servicesInfos, its values
      return [serviceInfos.to(projectInfos)] // call plugin to function, stores it in array
        .flat() // flat it in case response is an array
        .map((toResponse) => {
          if (typeof toResponse === 'string') { // if response is string, assume it's an url and create an ToService Object
            return {
              to: toResponse,
              description: serviceInfos.description ?? '',
              imgSrc: serviceInfos.imgSrc ?? '',
              title: serviceInfos.title ?? '',
            }
          } // ensure each keys are presents if some are missing, use the properties of the plugin or empty string
          if (toResponse instanceof Object && 'to' in toResponse) {
            return {
              ...toResponse,
              ...!toResponse.description && { description: serviceInfos.description ?? '' },
              ...!toResponse.imgSrc && { imgSrc: serviceInfos.imgSrc ?? '' },
              ...!toResponse.title && { title: serviceInfos.title ?? '' },
            }
          }
          return undefined // if function failed to generate response
        })
        .filter(toResponse => toResponse) // filter undefined response
    }).flat()
}
