type toUrlFnParamaters ={ project: string, organization: string, services: any }
export type ServiceInfos = {
  name: string
  to?: ({ project, organization, services }: toUrlFnParamaters) => string
  monitorUrl?: string
  title: string
  imgSrc?: string
  description?: string
}

export const servicesInfos: Record<string, ServiceInfos> = {}

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
