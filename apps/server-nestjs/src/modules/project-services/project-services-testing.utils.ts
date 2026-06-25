import type { Plugin } from '@cpn-console/hooks'
import type { PluginsUpdateBody } from '@cpn-console/shared'
import type { AdminPlugin, ProjectPlugin, ProjectWithDetails, PublicCluster } from './project-services-queries.utils'
import { DEFAULT } from '@cpn-console/shared'
import { faker } from '@faker-js/faker'

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

export function makeProjectWithDetails(overrides: Partial<ProjectWithDetails> = {}): ProjectWithDetails {
  return {
    id: faker.string.uuid(),
    name: faker.company.name(),
    slug: faker.helpers.slugify(faker.company.name()),
    description: faker.lorem.sentence(),
    clusters: [makePublicCluster()],
    environments: [],
    ...overrides,
  }
}

export function makeProjectPlugin(overrides: Partial<ProjectPlugin> = {}): ProjectPlugin {
  return {
    pluginName: makeServicesPluginName(),
    key: 'enabled',
    value: DEFAULT,
    ...overrides,
  }
}

export function makeServicesAdminPlugin(overrides: Partial<AdminPlugin> = {}): AdminPlugin {
  const pluginName = overrides.pluginName ?? makeServicesPluginName()
  const adminPlugin = {
    pluginName,
    key: 'enabled',
    value: DEFAULT,
  }
  return { ...adminPlugin, ...overrides, pluginName }
}

export function makePublicCluster(overrides: Partial<PublicCluster> = {}): PublicCluster {
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
  } as PublicCluster
}

export function makeServicesZone(overrides: Partial<PublicCluster['zone']> = {}): PublicCluster['zone'] {
  return {
    id: faker.string.uuid(),
    slug: faker.helpers.slugify(`zone-${faker.string.alphanumeric(8)}`),
    label: faker.location.city(),
    argocdUrl: `https://${faker.helpers.slugify(faker.location.city())}.example.com`,
    ...overrides,
  }
}

export function makeServicesEnvironment(overrides: Partial<ProjectWithDetails['environments'][number]> = {}): ProjectWithDetails['environments'][number] {
  const { cluster: clusterOverride, ...restOverrides } = overrides
  const cluster: PublicCluster = (clusterOverride ?? makePublicCluster()) as PublicCluster
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
  } as ProjectWithDetails['environments'][number]
}

export function makeServicesUpdateBody(pluginName: string = makeServicesPluginName()): PluginsUpdateBody {
  return {
    [pluginName]: {
      enabled: DEFAULT,
    },
  }
}
