import type { ProjectWithDetails } from './observability-datastore.service'

export function makeProject(overrides: Partial<ProjectWithDetails> = {}): ProjectWithDetails {
  return {
    id: '00000000-0000-4000-8000-000000000001',
    name: 'test-project',
    slug: 'test-project',
    ownerId: 'user-owner',
    everyonePerms: 0n,
    members: [],
    roles: [],
    environments: [{ id: 'env-1', name: 'dev', stage: { name: 'hprod' } }],
    plugins: [],
    ...overrides,
  }
}
