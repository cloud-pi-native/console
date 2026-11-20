import type { SystemSetting } from '@cpn-console/shared'
import { faker } from '@faker-js/faker'

export function makeSystemSetting() {
  return {
    key: faker.string.alphanumeric(),
    value: faker.string.alphanumeric(),
  } satisfies SystemSetting
}

export function makeSystemSettings() {
  return faker.helpers.multiple(() => makeSystemSetting(), {
    count: faker.number.int({ min: 1, max: 10 }),
  })
}
