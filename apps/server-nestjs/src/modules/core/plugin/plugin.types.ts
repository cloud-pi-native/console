import type { PluginConfig, PluginsUpdateBody } from '@cpn-console/shared'

export interface ServiceZone {
  id: string
  slug: string
  label: string
  argocdUrl: string
}

export interface ServiceUrlParameters {
  store: PluginsUpdateBody
  clusters: {
    id: string
    label: string
    privacy: 'public' | 'dedicated'
    clusterResources: boolean
    infos: string | null
    zone: ServiceZone
  }[]
  zones: ServiceZone[]
  environments: {
    id: string
    name: string
    createdAt: Date
    updatedAt: Date
    clusterId: string
  }[]
  project: { id: string, name: string, slug: string }
}

interface ServiceLink {
  to: string
  title?: string
  description?: string
}

export interface ServiceInfos {
  name: string
  title: string
  imgSrc?: string
  description?: string
  config?: PluginConfig
  to?: (parameters: ServiceUrlParameters) => ServiceLink | ServiceLink[] | string | void
}
