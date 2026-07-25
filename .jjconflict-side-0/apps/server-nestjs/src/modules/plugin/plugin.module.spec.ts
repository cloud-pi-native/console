import { ConditionalModule, ConfigModule } from '@nestjs/config'
import { Test } from '@nestjs/testing'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PluginModule } from './plugin.module'
import { PluginService } from './plugin.service'

describe('pluginModule', () => {
  afterEach(() => vi.unstubAllEnvs())

  it('omits PluginService when USE_ARGOCD=false', async () => {
    vi.stubEnv('USE_ARGOCD', 'false')
    const module = await Test.createTestingModule({
      imports: [ConfigModule.forRoot(), ConditionalModule.registerWhen(PluginModule, 'USE_ARGOCD')],
    }).compile()
    expect(() => module.get(PluginService)).toThrow()
  })

  it('omits PluginService when USE_GITLAB=false', async () => {
    vi.stubEnv('USE_GITLAB', 'false')
    const module = await Test.createTestingModule({
      imports: [ConfigModule.forRoot(), ConditionalModule.registerWhen(PluginModule, 'USE_GITLAB')],
    }).compile()
    expect(() => module.get(PluginService)).toThrow()
  })

  it('omits PluginService when USE_REGISTRY=false', async () => {
    vi.stubEnv('USE_REGISTRY', 'false')
    const module = await Test.createTestingModule({
      imports: [ConfigModule.forRoot(), ConditionalModule.registerWhen(PluginModule, 'USE_REGISTRY')],
    }).compile()
    expect(() => module.get(PluginService)).toThrow()
  })

  it('omits PluginService when USE_KEYCLOAK=false', async () => {
    vi.stubEnv('USE_KEYCLOAK', 'false')
    const module = await Test.createTestingModule({
      imports: [ConfigModule.forRoot(), ConditionalModule.registerWhen(PluginModule, 'USE_KEYCLOAK')],
    }).compile()
    expect(() => module.get(PluginService)).toThrow()
  })

  it('omits PluginService when USE_NEXUS=false', async () => {
    vi.stubEnv('USE_NEXUS', 'false')
    const module = await Test.createTestingModule({
      imports: [ConfigModule.forRoot(), ConditionalModule.registerWhen(PluginModule, 'USE_NEXUS')],
    }).compile()
    expect(() => module.get(PluginService)).toThrow()
  })

  it('omits PluginService when USE_SONARQUBE=false', async () => {
    vi.stubEnv('USE_SONARQUBE', 'false')
    const module = await Test.createTestingModule({
      imports: [ConfigModule.forRoot(), ConditionalModule.registerWhen(PluginModule, 'USE_SONARQUBE')],
    }).compile()
    expect(() => module.get(PluginService)).toThrow()
  })

  it('omits PluginService when USE_VAULT=false', async () => {
    vi.stubEnv('USE_VAULT', 'false')
    const module = await Test.createTestingModule({
      imports: [ConfigModule.forRoot(), ConditionalModule.registerWhen(PluginModule, 'USE_VAULT')],
    }).compile()
    expect(() => module.get(PluginService)).toThrow()
  })
})
