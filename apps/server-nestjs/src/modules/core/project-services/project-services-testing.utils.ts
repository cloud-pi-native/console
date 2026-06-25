import type { Plugin, ToUrlFnParamaters } from '@cpn-console/hooks'
import type { PluginsUpdateBody } from '@cpn-console/shared'
import type { Prisma } from '@prisma/client'
import type { projectServicesProjectSelect } from './project-services.utils.js'
import { DEFAULT } from '@cpn-console/shared'
import { faker } from '@faker-js/faker'

export function makeToUrlParams(overrides: Partial<ToUrlFnParamaters> = {}): ToUrlFnParamaters {
  return {
    store: {},
    clusters: [],
    zones: [],
    environments: [],
    project: { id: '', slug: 'dulei', name: '' },
    ...overrides,
  }
}

export type ProjectServicesProject = Prisma.ProjectGetPayload<{
  select: typeof projectServicesProjectSelect
}>

export type ProjectServicesProjectPlugin = Prisma.ProjectPluginGetPayload<{
  select: {
    pluginName: true
    key: true
    value: true
  }
}>

export type ProjectServicesAdminPlugin = Prisma.AdminPluginGetPayload<{
  select: {
    pluginName: true
    key: true
    value: true
  }
}>

export type ProjectServicesCluster = Prisma.ClusterGetPayload<{
  include: {
    zone: true
  }
}>

export function makeProjectServicesPluginName(): string {
  return faker.helpers.slugify(faker.company.name())
}

export function makeProjectServicesPlugin(overrides: Partial<Plugin['infos']> = {}): Plugin {
  const pluginName = overrides.name ?? makeProjectServicesPluginName()

  return {
    infos: {
      name: pluginName,
      title: faker.commerce.productName(),
      description: faker.lorem.sentence(),
      imgSrc: `/${faker.helpers.slugify(faker.commerce.product())}.svg`,
      config: {
        global: [],
        project: [
          {
            kind: 'switch',
            key: 'enabled',
            title: 'Enabled',
            value: DEFAULT,
            initialValue: DEFAULT,
            permissions: {
              user: { read: true, write: true },
              admin: { read: true, write: true },
            },
          },
        ],
      },
      to: ({ project }) => `/projects/${project.slug}`,
      ...overrides,
    },
    subscribedHooks: {},
  }
}

export function makeProjectServicesProject(overrides: Partial<ProjectServicesProject> = {}): ProjectServicesProject {
  return {
    id: faker.string.uuid(),
    name: faker.company.name(),
    slug: faker.helpers.slugify(faker.company.name()),
    description: faker.lorem.sentence(),
    clusters: [makeProjectServicesCluster()],
    environments: [],
    ...overrides,
  }
}

export function makeProjectServicesProjectPlugin(overrides: Partial<ProjectServicesProjectPlugin> = {}): ProjectServicesProjectPlugin {
  return {
    pluginName: makeProjectServicesPluginName(),
    key: 'enabled',
    value: DEFAULT,
    ...overrides,
  }
}

export function makeProjectServicesAdminPlugin(overrides: Partial<ProjectServicesAdminPlugin> = {}): ProjectServicesAdminPlugin {
  const pluginName = overrides.pluginName ?? makeProjectServicesPluginName()
  const adminPlugin = {
    pluginName,
    key: 'enabled',
    value: DEFAULT,
  }
  return { ...adminPlugin, ...overrides, pluginName }
}

export function makeProjectServicesCluster(overrides: Partial<ProjectServicesCluster> = {}): ProjectServicesCluster {
  const zone = makeProjectServicesZone()
  return {
    id: faker.string.uuid(),
    label: faker.company.name(),
    privacy: 'public',
    secretName: faker.string.uuid(),
    clusterResources: false,
    kubeConfigId: faker.string.uuid(),
    createdAt: faker.date.past(),
    updatedAt: faker.date.past(),
    infos: null,
    memory: faker.number.float({ min: 0, max: 1024, fractionDigits: 2 }),
    cpu: faker.number.float({ min: 0, max: 64, fractionDigits: 2 }),
    gpu: faker.number.float({ min: 0, max: 8, fractionDigits: 2 }),
    zoneId: zone.id,
    ...overrides,
    zone: overrides.zone ?? zone,
  } as ProjectServicesCluster
}

export function makeProjectServicesZone(overrides: Partial<ProjectServicesCluster['zone']> = {}): ProjectServicesCluster['zone'] {
  return {
    id: faker.string.uuid(),
    slug: faker.helpers.slugify(`zone-${faker.string.alphanumeric(8)}`),
    label: faker.location.city(),
    description: faker.lorem.sentence(),
    createdAt: faker.date.past(),
    updatedAt: faker.date.past(),
    argocdUrl: `https://${faker.helpers.slugify(faker.location.city())}.example.com`,
    ...overrides,
  }
}

export function makeProjectServicesEnvironment(overrides: Partial<ProjectServicesProject['environments'][number]> = {}): ProjectServicesProject['environments'][number] {
  const { cluster: clusterOverride, ...restOverrides } = overrides
  const cluster = clusterOverride ?? makeProjectServicesCluster()
  return {
    id: faker.string.uuid(),
    name: faker.word.noun(),
    createdAt: faker.date.past(),
    updatedAt: faker.date.past(),
    clusterId: cluster.id,
    cpu: 1,
    gpu: 0,
    memory: 1,
    autosync: true,
    cluster,
    ...restOverrides,
  } as ProjectServicesProject['environments'][number]
}

export function makeProjectServicesUpdateBody(pluginName: string = makeProjectServicesPluginName()): PluginsUpdateBody {
  return {
    [pluginName]: {
      enabled: DEFAULT,
    },
  }
}
