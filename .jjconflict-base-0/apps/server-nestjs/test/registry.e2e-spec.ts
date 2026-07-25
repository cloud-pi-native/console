import type { ConfigType } from '@nestjs/config'
import type { TestingModule } from '@nestjs/testing'
import type { BaseConfig } from '../src/config/base.config'
import { faker } from '@faker-js/faker'
import { ConfigModule } from '@nestjs/config'
import { Test } from '@nestjs/testing'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { baseConfigFactory } from '../src/config/base.config'
import { harborConfigFactory } from '../src/config/harbor.config'
import { RegistryClientService } from '../src/modules/registry/registry-client.service'
import { makeProjectWithDetails } from '../src/modules/registry/registry-testing.utils'
import { ROBOT_NAME_PROJECT, ROBOT_NAME_RO, ROBOT_NAME_RW } from '../src/modules/registry/registry.constants'
import { RegistryModule } from '../src/modules/registry/registry.module'
import { RegistryService } from '../src/modules/registry/registry.service'
import { getHostFromUrl, getProjectVaultPath } from '../src/modules/registry/registry.utils'
import { VaultClientService } from '../src/modules/vault/vault-client.service'
import { getDotenvPaths } from '../src/utils/dotenv.utils'
import { getAll } from '../src/utils/iterable.utils'

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
  let config: BaseConfig
  let harborConfig: ConfigType<typeof harborConfigFactory>
  let projectSlug: string

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ envFilePath: getDotenvPaths(), isGlobal: true, load: [baseConfigFactory, harborConfigFactory] }), RegistryModule],
    })
      .compile()

    await moduleRef.init()

    registry = moduleRef.get(RegistryService)
    client = moduleRef.get(RegistryClientService)
    vault = moduleRef.get(VaultClientService)
    config = moduleRef.get(baseConfigFactory)
    harborConfig = moduleRef.get(harborConfigFactory)

    projectSlug = faker.helpers.slugify(`test-project-${faker.string.alphanumeric({ length: 10 }).toLowerCase()}`).slice(0, 50)
  })

  afterAll(async () => {
    if (vault && config && projectSlug) {
      const paths = [ROBOT_NAME_RO, ROBOT_NAME_RW, ROBOT_NAME_PROJECT].map(name => getProjectVaultPath(makeProjectWithDetails({ slug: projectSlug }), config.projectsRootDir, `REGISTRY/${name}`))
      await Promise.all(paths.map(path => vault.delete(path).catch(() => {})))
    }

    if (registry && projectSlug) {
      await registry.deleteProject(projectSlug).catch(() => {})
    }

    await moduleRef?.close()
  })

  it('should provision project in Harbor and write robot secrets to Vault', async () => {
    const result = await registry.ensureProject({ slug: projectSlug, plugins: [] }, { publishProjectRobot: true })
    expect(result.basePath).toBe(`${getHostFromUrl(harborConfig.url)}/${projectSlug}/`)

    const project = await client.getProjectByName(projectSlug)
    expect(project.status).toBe(200)

    const robots = await getAll(client.getProjectRobots(Number(project.data?.project_id)))
    const robotNames = robots.flatMap(r => r.name ? [r.name] : [])
    expect(robotNames).toContain(`robot$${projectSlug}+${ROBOT_NAME_RO}`)
    expect(robotNames).toContain(`robot$${projectSlug}+${ROBOT_NAME_RW}`)
    expect(robotNames).toContain(`robot$${projectSlug}+${ROBOT_NAME_PROJECT}`)

    const vaultPaths = [ROBOT_NAME_RO, ROBOT_NAME_RW, ROBOT_NAME_PROJECT].map(name => getProjectVaultPath(makeProjectWithDetails({ slug: projectSlug }), config.projectsRootDir, `REGISTRY/${name}`))
    const [roSecret, rwSecret, projectSecret] = await Promise.all(vaultPaths.map(path => vault.read(path)))
    expect(roSecret.data?.HOST).toBe(getHostFromUrl(harborConfig.url))
    expect(rwSecret.data?.HOST).toBe(getHostFromUrl(harborConfig.url))
    expect(projectSecret.data?.HOST).toBe(getHostFromUrl(harborConfig.url))
    expect(roSecret.data?.USERNAME).toBe(`robot$${projectSlug}+${ROBOT_NAME_RO}`)
    expect(rwSecret.data?.USERNAME).toBe(`robot$${projectSlug}+${ROBOT_NAME_RW}`)
    expect(projectSecret.data?.USERNAME).toBe(`robot$${projectSlug}+${ROBOT_NAME_PROJECT}`)
  })
})
