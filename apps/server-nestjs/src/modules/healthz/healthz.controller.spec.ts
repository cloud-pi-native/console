import { afterEach, describe, expect, it, vi } from 'vitest'
import { ArgoCDHealthService } from '../argocd/argocd-health.service'
import { DatabaseHealthService } from '../infrastructure/database/database-health.service'
import { KeycloakHealthService } from '../keycloak/keycloak-health.service'
import { HealthzController } from './healthz.controller'

function fakeHealthService() {
  return { check: vi.fn().mockResolvedValue('up') }
}

const healthCheck = { check: vi.fn() }
const database = fakeHealthService()
const keycloak = fakeHealthService()
const gitlab = fakeHealthService()
const vault = fakeHealthService()
const nexus = fakeHealthService()
const registry = fakeHealthService()
const argocd = fakeHealthService()
const opencds = fakeHealthService()

function makeController() {
  return new HealthzController(
    healthCheck as any,
    database as any,
    keycloak as any,
    gitlab as any,
    vault as any,
    nexus as any,
    registry as any,
    argocd as any,
    opencds as any,
  )
}

describe('healthzController', () => {
  afterEach(() => vi.clearAllMocks())

  it('checks every injected probe, including those wired via @Optional', async () => {
    healthCheck.check.mockImplementation(async (checks: (() => unknown)[]) => (await Promise.all(checks.map(c => c()))))
    await makeController().check()

    // Core infra (always present here)
    expect(database.check).toHaveBeenCalledWith('database')
    expect(keycloak.check).toHaveBeenCalledWith('keycloak')
    // Optional "Service externe" (present in this test wiring)
    expect(gitlab.check).toHaveBeenCalledWith('gitlab')
    expect(vault.check).toHaveBeenCalledWith('vault')
    expect(nexus.check).toHaveBeenCalledWith('nexus')
    expect(registry.check).toHaveBeenCalledWith('registry')
    expect(argocd.check).toHaveBeenCalledWith('argocd')
    expect(opencds.check).toHaveBeenCalledWith('opencds')
  })

  it('omits a probe whose service is not registered (@Optional -> undefined)', async () => {
    healthCheck.check.mockImplementation(async (checks: (() => unknown)[]) => (await Promise.all(checks.map(c => c()))))
    const controller = new HealthzController(
      healthCheck as any,
      database as any, // database present
      undefined as any, // keycloak absent
      undefined as any,
      undefined as any,
      undefined as any,
      undefined as any,
      undefined as any,
      undefined as any,
    )

    await controller.check()

    expect(database.check).toHaveBeenCalledWith('database')
    expect(keycloak.check).not.toHaveBeenCalled()
    expect(gitlab.check).not.toHaveBeenCalled()
  })
})
