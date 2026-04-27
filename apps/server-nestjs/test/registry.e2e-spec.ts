import type { TestingModule } from '@nestjs/testing'
import { faker } from '@faker-js/faker'
import { Test } from '@nestjs/testing'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { ConfigurationModule } from '../src/cpin-module/infrastructure/configuration/configuration.module'
import { ConfigurationService } from '../src/cpin-module/infrastructure/configuration/configuration.service'
import { projectRobotName, RegistryClientService, roRobotName, rwRobotName } from '../src/modules/registry/registry-client.service'
import { makeProjectWithDetails } from '../src/modules/registry/registry-testing.utils'
import { RegistryModule } from '../src/modules/registry/registry.module'
import { RegistryService } from '../src/modules/registry/registry.service'
import { getHostFromUrl, getProjectVaultPath } from '../src/modules/registry/registry.utils'
import { VaultClientService } from '../src/modules/vault/vault-client.service'

const canRunRegistryE2E
  = Boolean(process.env.E2E)
    && Boolean(process.env.HARBOR_URL)
    && Boolean(process.env.HARBOR_ADMIN)
    && Boolean(process.env.HARBOR_ADMIN_PASSWORD)
    && Boolean(process.env.VAULT_URL)
    && Boolean(process.env.VAULT_TOKEN)
    && Boolean(process.env.PROJECTS_ROOT_DIR)

const describeWithRegistry = describe.runIf(canRunRegistryE2E)

describeWithRegistry('RegistryService (e2e)', () => {
  let moduleRef: TestingModule
  let registry: RegistryService
  let client: RegistryClientService
  let vault: VaultClientService
  let config: ConfigurationService
  let projectSlug: string

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [ConfigurationModule, RegistryModule],
    })
      .compile()

    await moduleRef.init()

    registry = moduleRef.get(RegistryService)
    client = moduleRef.get(RegistryClientService)
    vault = moduleRef.get(VaultClientService)
    config = moduleRef.get(ConfigurationService)

    projectSlug = faker.helpers.slugify(`test-project-${faker.string.alphanumeric({ length: 10 }).toLowerCase()}`).slice(0, 50)
  })

  afterAll(async () => {
    if (vault && config && projectSlug) {
      const paths = [roRobotName, rwRobotName, projectRobotName].map(name => getProjectVaultPath(makeProjectWithDetails({ slug: projectSlug }), config.projectRootDir, `REGISTRY/${name}`))
      await Promise.all(paths.map(path => vault.delete(path).catch(() => {})))
    }

    if (registry && projectSlug) {
      await registry.deleteProject(projectSlug).catch(() => {})
    }

    await moduleRef.close()
  })

  it('should provision project in Harbor and write robot secrets to Vault', async () => {
    const result = await registry.ensureProject({ slug: projectSlug, plugins: [] }, { publishProjectRobot: true })
    expect(result.basePath).toBe(`${getHostFromUrl(config.harborUrl!)}/${projectSlug}/`)

    const project = await client.getProjectByName(projectSlug)
    expect(project.status).toBe(200)

    const robots = await client.getProjectRobots(projectSlug)
    expect(robots.status).toBe(200)
    const robotNames = (robots.data ?? []).flatMap(r => r.name ? [r.name] : [])
    expect(robotNames).toContain(`robot$${projectSlug}+${roRobotName}`)
    expect(robotNames).toContain(`robot$${projectSlug}+${rwRobotName}`)
    expect(robotNames).toContain(`robot$${projectSlug}+${projectRobotName}`)

    const vaultPaths = [roRobotName, rwRobotName, projectRobotName].map(name => getProjectVaultPath(makeProjectWithDetails({ slug: projectSlug }), config.projectRootDir, `REGISTRY/${name}`))
    const [roSecret, rwSecret, projectSecret] = await Promise.all(vaultPaths.map(path => vault.read(path)))
    expect(roSecret.data?.HOST).toBe(getHostFromUrl(config.harborUrl!))
    expect(rwSecret.data?.HOST).toBe(getHostFromUrl(config.harborUrl!))
    expect(projectSecret.data?.HOST).toBe(getHostFromUrl(config.harborUrl!))
    expect(roSecret.data?.USERNAME).toBe(`robot$${projectSlug}+${roRobotName}`)
    expect(rwSecret.data?.USERNAME).toBe(`robot$${projectSlug}+${rwRobotName}`)
    expect(projectSecret.data?.USERNAME).toBe(`robot$${projectSlug}+${projectRobotName}`)
  })
})
