import type { Zone as ZoneType } from './zone-queries.utils'
import { faker } from '@faker-js/faker'

export function makeZone(overrides: Partial<ZoneType> = {}): ZoneType {
  return {
    id: faker.string.uuid(),
    slug: faker.helpers.slugify(faker.word.sample(5)).toLowerCase(),
    label: faker.word.sample(10),
    argocdUrl: `https://argocd.example.com/${faker.helpers.slugify(faker.word.sample(5))}`,
    description: faker.lorem.sentence(),
    createdAt: faker.date.past(),
    updatedAt: faker.date.past(),
    ...overrides,
  } satisfies ZoneType
}
