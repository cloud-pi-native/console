import type { ConfigType } from '@nestjs/config'
import type { observabilityConfigFactory } from '../../../config/observability.config'
import type { ObservabilityDatastoreService } from './observability-datastore.service'
import { describe, expect, it } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import { ObservabilityPluginService } from './observability-plugin.service'

describe('observabilityPluginService', () => {
  it('exposes configuration without loading a project', () => {
    const datastore = mockDeep<ObservabilityDatastoreService>()
    const config = mockDeep<ConfigType<typeof observabilityConfigFactory>>()
    const service = new ObservabilityPluginService(config, datastore)
    const manifest = service.manifest()
    expect(manifest.name).toBe('observability')
    expect(manifest.config?.global).toHaveLength(1)
    expect(manifest.to).toBeUndefined()
    expect(datastore.getProjectForInfos).not.toHaveBeenCalled()
  })
})
