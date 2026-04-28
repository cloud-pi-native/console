import type { SystemSetting } from '@cpn-console/shared'
import { faker } from '@faker-js/faker'

export function makeSystemSetting() {
  return {
    key: faker.string.alphanumeric(),
    value: faker.string.alphanumeric(),
  } satisfies SystemSetting
}
