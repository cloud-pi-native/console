import type { ToUrlFnParamaters } from '@cpn-console/hooks'

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
