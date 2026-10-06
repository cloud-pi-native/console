import type { TestingModule } from '@nestjs/testing'
import { ENABLED } from '@cpn-console/shared'
import { faker } from '@faker-js/faker'
import { ConfigModule } from '@nestjs/config'
import { Test } from '@nestjs/testing'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { baseConfigFactory } from '../src/config/base.config'
import { harborConfigFactory } from '../src/config/harbor.config'
import { nexusConfigFactory } from '../src/config/nexus.config'
import { AuthModule } from '../src/modules/infrastructure/auth/auth.module'
import { DatabaseModule } from '../src/modules/infrastructure/database/database.module'
import { PrismaService } from '../src/modules/infrastructure/database/prisma.service'
import { EventsModule } from '../src/modules/infrastructure/events/events.module'
import { LoggerModule } from '../src/modules/infrastructure/logger/logger.module'
import { PermissionModule } from '../src/modules/infrastructure/permission/permission.module'
import { ProjectSecretsModule } from '../src/modules/project-secrets/project-secrets.module'
import { ProjectSecretsService } from '../src/modules/project-secrets/project-secrets.service'
import { VaultClientService } from '../src/modules/vault/vault-client.service'
import { generateProjectPath } from '../src/modules/vault/vault.utils'
import { getDotenvPaths } from '../src/utils/dotenv.utils'

const canRunProjectSecretsE2E
  = Boolean(process.env.E2E)

const describeWithProjectSecrets = describe.runIf(canRunProjectSecretsE2E)

describeWithProjectSecrets('ProjectSecretsService (e2e)', () => {
  let moduleRef: TestingModule
  let prisma: PrismaService
  let service: ProjectSecretsService
  let vaultClient: VaultClientService
  let projectsRootDir: string
  let harborUrl: string
  let nexusUrl: string

  let ownerId: string
  let projectId: string
  let projectSlug: string
  let projectPath: string

  const groups = ['GITLAB', 'NEXUS', 'REGISTRY', 'VAULT'] as const

  beforeAll(async () => {
    vi.stubEnv('USE_GITLAB', 'true')
    vi.stubEnv('USE_NEXUS', 'true')
    vi.stubEnv('USE_HARBOR', 'true')
    vi.stubEnv('USE_VAULT', 'true')

    moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ envFilePath: getDotenvPaths(), isGlobal: true, load: [baseConfigFactory] }), AuthModule, DatabaseModule, EventsModule, LoggerModule, PermissionModule, ProjectSecretsModule],
    }).compile()

    await moduleRef.init()

    prisma = moduleRef.get(PrismaService)
    service = moduleRef.get(ProjectSecretsService)
    vaultClient = moduleRef.get(VaultClientService)
    projectsRootDir = moduleRef.get(baseConfigFactory.KEY).projectsRootDir
    harborUrl = moduleRef.get(harborConfigFactory.KEY).url
    nexusUrl = moduleRef.get(nexusConfigFactory.KEY).url

    ownerId = faker.string.uuid()
    projectId = faker.string.uuid()
    projectSlug = faker.helpers.slugify(`e2e-project-${faker.string.uuid()}`)
    projectPath = generateProjectPath(projectsRootDir, projectSlug)

    await Promise.all(groups.map(group => vaultClient.delete(`${projectPath}/${group}`).catch(() => {})))

    await prisma.user.create({
      data: {
        id: ownerId,
        email: faker.internet.email().toLowerCase(),
        firstName: 'E2E',
        lastName: 'Owner',
        type: 'human',
      },
    })

    await prisma.project.create({
      data: {
        id: projectId,
        slug: projectSlug,
        name: projectSlug,
        ownerId,
        description: 'E2E test project',
        status: 'created',
        locked: false,
        limitless: false,
        hprodCpu: 0,
        hprodGpu: 0,
        hprodMemory: 0,
        prodCpu: 0,
        prodGpu: 0,
        prodMemory: 0,
        everyonePerms: 0n,
        lastSuccessProvisionningVersion: null,
        plugins: {
          create: [
            { pluginName: 'nexus', key: 'activateNpmRepo', value: ENABLED },
            { pluginName: 'nexus', key: 'activateMavenRepo', value: ENABLED },
          ],
        },
      },
    })
  })

  afterAll(async () => {
    await Promise.all(groups.map(group => vaultClient.delete(`${projectPath}/${group}`).catch(() => {})))

    if (prisma) {
      await prisma.project.deleteMany({ where: { id: projectId } }).catch(() => {})
      await prisma.user.deleteMany({ where: { id: ownerId } }).catch(() => {})
    }

    await moduleRef?.close()

    vi.unstubAllEnvs()
  })

  it('returns the synthesized Nexus URLs and the synthetic Vault group when no Vault secrets exist', async () => {
    const secrets = await service.get(projectId)
    expect(secrets).toEqual({
      NEXUS: {
        MAVEN_REPO_RELEASE: new URL(`${projectSlug}-repository-release`, nexusUrl).toString(),
        MAVEN_REPO_SNAPSHOT: new URL(`${projectSlug}-repository-snapshot`, nexusUrl).toString(),
        NPM_REPO: new URL(`${projectSlug}-npm`, nexusUrl).toString(),
      },
      VAULT: {
        '.spec.mount': projectSlug,
        '.spec.vaultAuthRef': 'vault-auth',
      },
    })
  })

  describe('when Vault secrets exist', () => {
    beforeAll(async () => {
      await Promise.all([
        vaultClient.write({
          key1: 'value1',
          key2: 42,
        }, `${projectPath}/GITLAB`),
        vaultClient.write({
          REGISTRY_ROBOT_SECRET: 'robot',
        }, `${projectPath}/REGISTRY`),
        vaultClient.write({
          VAULT_ROLE: 'role',
        }, `${projectPath}/VAULT`),
      ])
    })

    afterAll(async () => {
      await Promise.all(groups.map(group => vaultClient.delete(`${projectPath}/${group}`).catch(() => {})))
    })

    it('parses real Vault values into grouped secrets', async () => {
      const secrets = await service.get(projectId)

      // raw keys are stringified by the read layer, and each module enriches its own group
      expect(secrets.GITLAB).toEqual({
        key1: 'value1',
        key2: '42',
      })
      // NEXUS synthesizes repo URLs from config and per-project repo activation
      expect(secrets.NEXUS).toEqual({
        MAVEN_REPO_RELEASE: new URL(`${projectSlug}-repository-release`, nexusUrl).toString(),
        MAVEN_REPO_SNAPSHOT: new URL(`${projectSlug}-repository-snapshot`, nexusUrl).toString(),
        NPM_REPO: new URL(`${projectSlug}-npm`, nexusUrl).toString(),
      })
      const harborUrlObj = new URL(`${projectSlug}/`, harborUrl)
      expect(secrets.REGISTRY).toEqual({
        REGISTRY_ROBOT_SECRET: 'robot',
        'Registry base path': `${harborUrlObj.host}${harborUrlObj.pathname}`,
      })
      expect(secrets.VAULT).toEqual({
        '.spec.mount': projectSlug,
        '.spec.vaultAuthRef': 'vault-auth',
      })
    })
  })
})
