import { vi, describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { apiClient } from '../api/xhr-client.js'
import { useSystemSettingsStore } from './system-settings.js'

const listSystemSettings = vi.spyOn(apiClient.SystemSettings, 'listSystemSettings')
const upsertSystemSetting = vi.spyOn(apiClient.SystemSettings, 'upsertSystemSetting')

describe('System Settings Store', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    // creates a fresh pinia and make it active so it's automatically picked
    // up by any useStore() call without having to pass it to it: `useStore(pinia)`
    setActivePinia(createPinia())
  })

  it('Should get system settings list by api call', async () => {
    const data = [
      { key: 'maintenace', value: 'on' },
      { key: 'theme', value: 'dsfr' },
      { key: 'organisation', value: 'miom' },
    ]
    listSystemSettings.mockReturnValueOnce(Promise.resolve({ status: 200, body: data }))
    const systemSettingsStore = useSystemSettingsStore()

    await systemSettingsStore.listSystemSettings()

    expect(systemSettingsStore.systemSettings).toEqual(data)
    expect(listSystemSettings).toHaveBeenCalledTimes(1)
  })

  it('Should upsert a system setting by api call', async () => {
    const data = [
      { key: 'maintenace', value: 'on' },
      { key: 'theme', value: 'dsfr' },
      { key: 'organisation', value: 'miom' },
    ]
    const newSystemSetting = { key: 'organisation', value: 'mj' }
    const newData = [
      { key: 'maintenace', value: 'on' },
      { key: 'theme', value: 'dsfr' },
      { key: 'organisation', value: 'mj' },
    ]

    upsertSystemSetting.mockReturnValueOnce(Promise.resolve({ status: 201, body: newSystemSetting }))
    const systemSettingsStore = useSystemSettingsStore()
    systemSettingsStore.systemSettings = data

    const res = await systemSettingsStore.upsertSystemSetting(data)

    expect(res).toEqual(newSystemSetting)
    expect(systemSettingsStore.systemSettings).toEqual(newData)
    expect(upsertSystemSetting).toHaveBeenCalledTimes(1)
  })
})
