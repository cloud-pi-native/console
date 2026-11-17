import type { ServiceUrlParameters } from './plugin.types'

export function makeToUrlParams(overrides: Partial<ServiceUrlParameters> = {}): ServiceUrlParameters {
  return {
    store: {},
    clusters: [],
    zones: [],
    environments: [],
    project: { id: '', slug: 'dulei', name: '' },
    ...overrides,
  }
}
