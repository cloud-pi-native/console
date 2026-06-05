import type { Plugin } from '@cpn-console/hooks'
import type { PluginsUpdateBody } from '@cpn-console/shared'
import type { Prisma } from '@prisma/client'
import type { projectServicesProjectSelect } from './services.utils'
import { DEFAULT } from '@cpn-console/shared'
import { faker } from '@faker-js/faker'

export type ServicesProject = Prisma.ProjectGetPayload<{
  select: typeof projectServicesProjectSelect
}>

export type ServicesProjectPlugin = Prisma.ProjectPluginGetPayload<{
  select: {
    pluginName: true
    key: true
    value: true
  }
}>

export type ServicesAdminPlugin = Prisma.AdminPluginGetPayload<{
  select: {
    pluginName: true
    key: true
    value: true
  }
}>

export type ServicesCluster = Prisma.ClusterGetPayload<{
  include: {
    zone: true
  }
}>

export function makeServicesPluginName(): string {
  return faker.helpers.slugify(faker.company.name())
}

export function makeServicesPlugin(overrides: Partial<Plugin['infos']> = {}): Plugin {
  const pluginName = overrides.name ?? makeServicesPluginName()

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

export function makeServicesProject(overrides: Partial<ServicesProject> = {}): ServicesProject {
  return {
    id: faker.string.uuid(),
    name: faker.company.name(),
    slug: faker.helpers.slugify(faker.company.name()),
    description: faker.lorem.sentence(),
    clusters: [makeServicesCluster()],
    environments: [],
    ...overrides,
  }
}

export function makeServicesProjectPlugin(overrides: Partial<ServicesProjectPlugin> = {}): ServicesProjectPlugin {
  return {
    pluginName: makeServicesPluginName(),
    key: 'enabled',
    value: DEFAULT,
    ...overrides,
  }
}

export function makeServicesAdminPlugin(overrides: Partial<ServicesAdminPlugin> = {}): ServicesAdminPlugin {
  const pluginName = overrides.pluginName ?? makeServicesPluginName()
  const adminPlugin = {
    pluginName,
    key: 'enabled',
    value: DEFAULT,
  }
  return { ...adminPlugin, ...overrides, pluginName }
}

export function makeServicesCluster(overrides: Partial<ServicesCluster> = {}): ServicesCluster {
  const zone = makeServicesZone()
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
  } as ServicesCluster
}

export function makeServicesZone(overrides: Partial<ServicesCluster['zone']> = {}): ServicesCluster['zone'] {
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

export function makeServicesEnvironment(overrides: Partial<ServicesProject['environments'][number]> = {}): ServicesProject['environments'][number] {
  const { cluster: clusterOverride, ...restOverrides } = overrides
  const cluster = clusterOverride ?? makeServicesCluster()
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
  } as ServicesProject['environments'][number]
}

export function makeServicesUpdateBody(pluginName: string = makeServicesPluginName()): PluginsUpdateBody {
  return {
    [pluginName]: {
      enabled: DEFAULT,
    },
  }
}
