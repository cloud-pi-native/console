import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { apiClient } from '../api/xhr-client.js'
import { useSystemSettingsStore } from './system-settings.js'

const listSystemSettings = vi.spyOn(apiClient.SystemSettings, 'listSystemSettings')
const upsertSystemSettings = vi.spyOn(apiClient.SystemSettings, 'upsertSystemSettings')

describe('system Settings Store', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    // creates a fresh pinia and make it active so it's automatically picked
    // up by any useStore() call without having to pass it to it: `useStore(pinia)`
    setActivePinia(createPinia())
  })

  it('should get system settings list by api call', async () => {
    const sytemSettings = { maintenace: 'true', theme: 'dsfr', organisation: 'miom' }
    // @ts-expect-error TS2345
    listSystemSettings.mockReturnValueOnce(Promise.resolve({ status: 200, body: sytemSettings }))
    const systemSettingsStore = useSystemSettingsStore()

    await systemSettingsStore.listSystemSettings()

    expect(systemSettingsStore.systemSettings).toEqual(sytemSettings)
    expect(listSystemSettings).toHaveBeenCalledTimes(1)
  })

  it('should upsert a system setting by api call', async () => {
    const sytemSettings = { maintenace: 'true', theme: 'dsfr', organisation: 'miom' }
    const newSystemSettings = { maintenace: 'true', theme: 'dsfr', organisation: 'mj' }

    // @ts-expect-error TS2345
    upsertSystemSettings.mockReturnValueOnce(Promise.resolve({ status: 201, body: newSystemSettings }))
    const systemSettingsStore = useSystemSettingsStore()
    systemSettingsStore.systemSettings = sytemSettings

    await systemSettingsStore.upsertSystemSettings(sytemSettings)

    expect(systemSettingsStore.systemSettings).toEqual(newSystemSettings)
    expect(upsertSystemSettings).toHaveBeenCalledTimes(1)
  })
})
