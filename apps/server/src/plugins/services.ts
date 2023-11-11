import { MonitorInfos } from '@dso-console/shared'

type toUrlFnParamaters = { project: string, organization: string, services: any }

export type ServiceInfos = {
  name: string
  to?: ({ project, organization, services }: toUrlFnParamaters) => string
  monitor?: (currentDate: Date, force: boolean) => Promise<MonitorInfos>
  title: string
  imgSrc?: string
  description?: string
}

export const servicesInfos: Record<string, ServiceInfos> = {}
export const servicesMonitor = async (force: boolean) => {
  const currentDate = new Date()
  const servicesToMonitor = Object.entries(servicesInfos)
    .filter(([_service, infos]) => infos.monitor)
    .map(([service, _infos]) => service)
  return Promise.all(
    servicesToMonitor.map(async (service) => {
      return {
        name: servicesInfos[service].title,
        ...(await servicesInfos[service].monitor(currentDate, force)),
      }
    }),
  )
}

export const getProjectServices = (projectInfos: toUrlFnParamaters) => Object.fromEntries(
  Object.entries(servicesInfos)
    .filter((entry: [string, ServiceInfos]) => entry[1].to)
    .map(([name, serviceInfos]: [string, ServiceInfos]) => {
      return [name, {
        ...serviceInfos,
        to: serviceInfos.to ? serviceInfos.to(projectInfos) : undefined,
      }]
    }),
)
