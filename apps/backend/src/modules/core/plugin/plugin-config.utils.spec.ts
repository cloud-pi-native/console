import type { ServiceInfos } from './plugin.types'
import { DEFAULT, DISABLED, ENABLED } from '@cpn-console/shared'
import { describe, expect, it } from 'vitest'
import { buildEditStrippers, defaultOrNullish, populateServiceManifest, specificallyDisabled, specificallyEnabled } from './plugin-config.utils'

function makeService(): ServiceInfos {
  return {
    name: 'example',
    title: 'Example',
    config: {
      project: [{
        key: 'enabled',
        kind: 'switch',
        title: 'Enabled',
        value: ENABLED,
        initialValue: ENABLED,
        permissions: {
          user: { read: true, write: false },
          admin: { read: true, write: true },
        },
      }],
      global: [],
    },
  }
}

describe('configuration switches', () => {
  it.each([
    { value: undefined, enabled: undefined, disabled: undefined, fallback: true },
    { value: '', enabled: undefined, disabled: undefined, fallback: true },
    { value: DEFAULT, enabled: false, disabled: false, fallback: true },
    { value: ENABLED, enabled: true, disabled: false, fallback: false },
    { value: DISABLED, enabled: false, disabled: true, fallback: false },
    { value: 'invalid', enabled: false, disabled: false, fallback: false },
  ])('interprets $value', ({ value, enabled, disabled, fallback }) => {
    expect(specificallyEnabled(value)).toBe(enabled)
    expect(specificallyDisabled(value)).toBe(disabled)
    expect(defaultOrNullish(value)).toBe(fallback)
  })
})

describe('service configuration', () => {
  it('strips fields the project user cannot write', () => {
    const schema = buildEditStrippers([makeService()])
    expect(schema.project.user.parse({ example: { enabled: DISABLED } })).toEqual({ example: {} })
    expect(schema.project.admin.parse({ example: { enabled: DISABLED } })).toEqual({ example: { enabled: DISABLED } })
  })

  it('defaults missing or invalid stored switches without mutating the manifest', () => {
    const service = makeService()
    const result = populateServiceManifest({
      service,
      data: { project: [{ pluginName: 'example', key: 'enabled', value: 'invalid' }] },
      select: { project: true },
      permissionTarget: 'user',
    })
    expect(result.project?.[0].value).toBe(DEFAULT)
    expect(service.config?.project[0].value).toBe(ENABLED)
  })

  it('does not use a stored value from another integration', () => {
    const result = populateServiceManifest({
      service: makeService(),
      data: { project: [{ pluginName: 'other', key: 'enabled', value: DISABLED }] },
      select: { project: true },
      permissionTarget: 'admin',
    })
    expect(result.project?.[0].value).toBe(DEFAULT)
  })
})
