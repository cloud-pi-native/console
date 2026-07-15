import type { Plugin } from '@cpn-console/hooks'
import type { PluginsUpdateBody } from '@cpn-console/shared'
import type { Cluster, Environment, ProjectPlugin as PrismaProjectPlugin, Project, Zone } from '@prisma/client'
import type { AdminPlugin, ProjectPlugin, ProjectWithDetails, PublicCluster } from './project-services-queries.utils'
import { DEFAULT } from '@cpn-console/shared'
import { faker } from '@faker-js/faker'

/** Narrow zone shape the service reads from `PublicCluster.zone` / environment clusters. */
export type PublicZone = PublicCluster['zone']

export function makeServicesPluginName(): string {
  return faker.helpers.slugify(faker.company.name())
}

export function makePlugin(overrides: Partial<Plugin['infos']> = {}): Plugin {
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
    projectId: faker.string.uuid(),
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
  const resolvedZone = overrides.zone ?? makeServicesZone()
  return {
    id: faker.string.uuid(),
    label: faker.company.name(),
    privacy: 'public',
    clusterResources: false,
    infos: null,
    zone: resolvedZone,
    ...overrides,
  }
}

export function makeServicesZone(overrides: Partial<PublicZone> = {}): PublicZone {
  return {
    id: faker.string.uuid(),
    slug: faker.helpers.slugify(`zone-${faker.string.alphanumeric(8)}`),
    label: faker.location.city(),
    argocdUrl: `https://${faker.helpers.slugify(faker.location.city())}.example.com`,
    ...overrides,
  }
}

export function makeServicesEnvironment(overrides: Partial<ProjectWithDetails['environments'][number]> & { cluster?: PublicCluster } = {}): ProjectWithDetails['environments'][number] {
  const { cluster: clusterOverride, ...restOverrides } = overrides
  const cluster = clusterOverride ?? makePublicCluster()
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
  }
}

export function makeServicesUpdateBody(pluginName: string = makeServicesPluginName()): PluginsUpdateBody {
  return {
    [pluginName]: {
      enabled: DEFAULT,
    },
  }
}

export type ClusterWithZone = Cluster & { zone: Zone }

export function makeCluster(overrides: Partial<Cluster> = {}): Cluster {
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
    zoneId: faker.string.uuid(),
    ...overrides,
  }
}

export function makeClusterWithZone(overrides: Partial<ClusterWithZone> = {}): ClusterWithZone {
  const resolvedZone = overrides.zone ?? {
    id: faker.string.uuid(),
    slug: faker.helpers.slugify(`zone-${faker.string.alphanumeric(8)}`),
    label: faker.location.city(),
    description: faker.lorem.sentence(),
    createdAt: faker.date.past(),
    updatedAt: faker.date.past(),
    argocdUrl: `https://${faker.helpers.slugify(faker.location.city())}.example.com`,
  }
  const { zone: _zone, ...clusterOverrides } = overrides
  return {
    ...makeCluster(clusterOverrides),
    zoneId: clusterOverrides.zoneId ?? resolvedZone.id,
    zone: resolvedZone,
  }
}

export function makeEnvironment(overrides: Partial<Environment> = {}): Environment {
  return {
    id: faker.string.uuid(),
    name: faker.word.noun(),
    projectId: faker.string.uuid(),
    memory: faker.number.float({ min: 0, max: 10, fractionDigits: 1 }),
    cpu: faker.number.float({ min: 0, max: 10, fractionDigits: 1 }),
    gpu: faker.number.float({ min: 0, max: 10, fractionDigits: 1 }),
    autosync: true,
    createdAt: faker.date.past(),
    updatedAt: faker.date.past(),
    clusterId: faker.string.uuid(),
    stageId: faker.string.uuid(),
    ...overrides,
  }
}

export type EnvironmentWithCluster = Environment & { cluster: ClusterWithZone }

export function makeEnvironmentWithCluster(overrides: Partial<EnvironmentWithCluster> = {}): EnvironmentWithCluster {
  const resolvedCluster = overrides.cluster ?? makeClusterWithZone()
  const { cluster: _cluster, ...envOverrides } = overrides
  return {
    ...makeEnvironment(envOverrides),
    clusterId: envOverrides.clusterId ?? resolvedCluster.id,
    cluster: resolvedCluster,
  }
}

export type ProjectWithRelations = Project & {
  plugins: PrismaProjectPlugin[]
  clusters: ClusterWithZone[]
  environments: EnvironmentWithCluster[]
}

export function makeProject(overrides: Partial<ProjectWithRelations> = {}): ProjectWithRelations {
  return {
    id: faker.string.uuid(),
    name: faker.company.name(),
    description: faker.lorem.sentence(),
    status: 'created',
    locked: false,
    createdAt: faker.date.past(),
    updatedAt: faker.date.past(),
    everyonePerms: 896n,
    ownerId: faker.string.uuid(),
    slug: faker.helpers.slugify(faker.company.name()),
    limitless: true,
    hprodCpu: 0,
    hprodGpu: 0,
    hprodMemory: 0,
    prodCpu: 0,
    prodGpu: 0,
    prodMemory: 0,
    lastSuccessProvisionningVersion: null,
    plugins: [],
    clusters: [],
    environments: [],
    ...overrides,
  }
}

export function makeProjectWithRelations(overrides: Partial<ProjectWithRelations> = {}): ProjectWithRelations {
  return makeProject(overrides)
}
