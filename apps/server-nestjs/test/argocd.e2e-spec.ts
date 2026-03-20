import type { CommitAction, Gitlab } from '@gitbeaker/core'
import type { TestingModule } from '@nestjs/testing'
import { faker } from '@faker-js/faker'
import { Test } from '@nestjs/testing'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { parse } from 'yaml'
import { ConfigurationModule } from '../src/cpin-module/infrastructure/configuration/configuration.module'
import { ConfigurationService } from '../src/cpin-module/infrastructure/configuration/configuration.service'
import { PrismaService } from '../src/cpin-module/infrastructure/database/prisma.service'
import { InfrastructureModule } from '../src/cpin-module/infrastructure/infrastructure.module'
import { ArgoCDControllerService } from '../src/modules/argocd/argocd-controller.service'
import { projectSelect } from '../src/modules/argocd/argocd-datastore.service'
import { ArgoCDModule } from '../src/modules/argocd/argocd.module'
import { GITLAB_REST_CLIENT, GitlabClientService } from '../src/modules/gitlab/gitlab-client.service'
import { VaultClientService } from '../src/modules/vault/vault-client.service'

const canRunArgoCDE2E
  = Boolean(process.env.E2E)
    && Boolean(process.env.GITLAB_URL)
    && Boolean(process.env.GITLAB_TOKEN)
    && Boolean(process.env.VAULT_URL)
    && Boolean(process.env.VAULT_TOKEN)
    && Boolean(process.env.PROJECTS_ROOT_DIR)
    && Boolean(process.env.DB_URL)

const describeWithArgoCD = describe.runIf(canRunArgoCDE2E)

describeWithArgoCD('ArgoCDController (e2e)', {}, () => {
  let moduleRef: TestingModule
  let argocdController: ArgoCDControllerService
  let gitlab: GitlabClientService
  let gitlabClient: Gitlab
  let vault: VaultClientService
  let prisma: PrismaService
  let config: ConfigurationService

  let ownerId: string
  let testProjectId: string
  let testProjectSlug: string

  let zoneId: string
  let zoneSlug: string
  let kubeconfigId: string
  let clusterId: string
  let clusterLabel: string
  let stageId: string
  let envDevId: string
  let envProdId: string
  let envDevName: string
  let envProdName: string

  let infraRepoId: number | undefined
  let infraRepoPath: string
  let vaultProjectValuesPath: string | undefined

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [ArgoCDModule, ConfigurationModule, InfrastructureModule],
    }).compile()

    await moduleRef.init()

    argocdController = moduleRef.get<ArgoCDControllerService>(ArgoCDControllerService)
    gitlab = moduleRef.get<GitlabClientService>(GitlabClientService)
    gitlabClient = moduleRef.get<Gitlab>(GITLAB_REST_CLIENT)
    vault = moduleRef.get<VaultClientService>(VaultClientService)
    prisma = moduleRef.get<PrismaService>(PrismaService)
    config = moduleRef.get<ConfigurationService>(ConfigurationService)

    ownerId = faker.string.uuid()
    testProjectId = faker.string.uuid()
    testProjectSlug = faker.helpers.slugify(`test-project-${faker.string.uuid()}`)

    zoneId = faker.string.uuid()
    zoneSlug = faker.string.alphanumeric({ length: 10 }).toLowerCase()
    kubeconfigId = faker.string.uuid()
    clusterId = faker.string.uuid()
    clusterLabel = faker.helpers.slugify(`cluster-${faker.string.uuid()}`.slice(0, 40))
    stageId = faker.string.uuid()
    envDevId = faker.string.uuid()
    envProdId = faker.string.uuid()
    envDevName = 'dev'
    envProdName = 'prod'

    await prisma.user.create({
      data: {
        id: ownerId,
        email: faker.internet.email().toLowerCase(),
        firstName: 'Test',
        lastName: 'Owner',
        type: 'human',
      },
    })

    await prisma.zone.create({
      data: {
        id: zoneId,
        slug: zoneSlug,
        label: `Zone ${zoneSlug}`,
        argocdUrl: 'https://example.com',
      },
    })

    await prisma.kubeconfig.create({
      data: {
        id: kubeconfigId,
        user: { token: faker.string.alphanumeric({ length: 16 }) },
        cluster: { server: 'https://example.com' },
      },
    })

    await prisma.cluster.create({
      data: {
        id: clusterId,
        label: clusterLabel,
        secretName: faker.string.uuid(),
        kubeConfigId: kubeconfigId,
        infos: null,
        memory: 100,
        cpu: 100,
        gpu: 0,
        zoneId,
      },
    })

    await prisma.stage.create({
      data: {
        id: stageId,
        name: faker.helpers.slugify(`stage-${faker.string.uuid()}`),
      },
    })

    await prisma.project.create({
      data: {
        id: testProjectId,
        slug: testProjectSlug,
        name: testProjectSlug,
        ownerId,
        description: 'E2E Test Project',
        hprodCpu: 0,
        hprodGpu: 0,
        hprodMemory: 0,
        prodCpu: 0,
        prodGpu: 0,
        prodMemory: 0,
        clusters: {
          connect: { id: clusterId },
        },
        repositories: {
          create: {
            internalRepoName: zoneSlug,
            isInfra: true,
            deployRevision: 'HEAD',
            deployPath: '.',
            helmValuesFiles: '',
          },
        },
        environments: {
          create: [
            {
              id: envDevId,
              name: envDevName,
              clusterId,
              stageId,
              cpu: 1,
              gpu: 0,
              memory: 1,
              autosync: true,
            },
            {
              id: envProdId,
              name: envProdName,
              clusterId,
              stageId,
              cpu: 1,
              gpu: 0,
              memory: 1,
              autosync: true,
            },
          ],
        },
      },
    })

    infraRepoPath = `${config.projectRootPath}/infra/${zoneSlug}`
    try {
      const existing = await gitlabClient.Projects.show(infraRepoPath)
      if (existing.empty_repo || existing.default_branch !== 'main') {
        await gitlabClient.Projects.remove(existing.id).catch(() => {})
        throw new Error('Recreate infra repo')
      }
      infraRepoId = existing.id
    } catch (error: any) {
      const description = error?.cause?.description ?? ''
      if (
        !(typeof description === 'string' && description.includes('404'))
        && !(error instanceof Error && error.message === 'Recreate infra repo')
      ) {
        throw error
      }

      const infraGroup = await gitlab.getOrCreateProjectSubGroup('infra')
      const created = await gitlabClient.Projects.create({
        name: zoneSlug,
        path: zoneSlug,
        namespaceId: infraGroup.id,
        initializeWithReadme: true,
        defaultBranch: 'main',
      } as any)
      infraRepoId = created.id
    }

    vaultProjectValuesPath = `${config.projectRootPath}/${testProjectId}`
    await vault.write({ e2e: true }, vaultProjectValuesPath)
  })

  afterAll(async () => {
    if (vaultProjectValuesPath) {
      await vault.delete(vaultProjectValuesPath).catch(() => {})
    }

    if (infraRepoId) {
      await gitlabClient.Projects.remove(infraRepoId).catch(() => {})
    }

    if (prisma) {
      await prisma.project.deleteMany({ where: { id: testProjectId } }).catch(() => {})
      await prisma.stage.deleteMany({ where: { id: stageId } }).catch(() => {})
      await prisma.cluster.deleteMany({ where: { id: clusterId } }).catch(() => {})
      await prisma.kubeconfig.deleteMany({ where: { id: kubeconfigId } }).catch(() => {})
      await prisma.zone.deleteMany({ where: { id: zoneId } }).catch(() => {})
      await prisma.user.deleteMany({ where: { id: ownerId } }).catch(() => {})
    }

    await moduleRef.close()

    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  it('should commit environment values and cleanup stale values in the zone infra repo', async () => {
    const project = await prisma.project.findUniqueOrThrow({
      where: { id: testProjectId },
      select: projectSelect,
    })

    const infraProject = await gitlab.getOrCreateInfraGroupRepo(zoneSlug)
    infraRepoId = infraProject.id

    const staleFilePath = `${project.name}/${clusterLabel}/stale/values.yaml`
    if (!infraRepoId) throw new Error('Missing infra repo id')
    const staleAction = await gitlab.generateCreateOrUpdateAction(infraProject, 'main', staleFilePath, 'stale: true\n')
    await gitlab.maybeCreateCommit(infraProject, 'ci: :robot_face: Seed stale values', staleAction ? [staleAction] : [])

    await argocdController.handleUpsert(project)

    const expectedFilePath = `${project.name}/${clusterLabel}/${envDevName}/values.yaml`
    const file = await gitlabClient.RepositoryFiles.show(infraRepoId, expectedFilePath, 'main')
    const raw = Buffer.from(file.content, 'base64').toString('utf8')
    const values = parse(raw) as any

    expect(values?.common?.['dso/project.slug']).toBe(testProjectSlug)
    expect(values?.common?.['dso/environment']).toBe(envDevName)
    expect(values?.environment?.valueFilePath).toBe(expectedFilePath)
    expect(values?.application?.destination?.name).toBe(clusterLabel)
    expect(values?.application?.autosync).toBe(true)

    const shouldBeDeleted = await gitlab.getFile(infraProject, staleFilePath, 'main')
    expect(shouldBeDeleted).toBeUndefined()
  }, 144000)

  it('should update existing values and delete values of a removed environment', async () => {
    const before = await prisma.project.findUniqueOrThrow({
      where: { id: testProjectId },
      select: projectSelect,
    })

    const infraProject = await gitlab.getOrCreateInfraGroupRepo(zoneSlug)
    infraRepoId = infraProject.id

    const devFilePath = `${before.name}/${clusterLabel}/${envDevName}/values.yaml`
    const prodFilePath = `${before.name}/${clusterLabel}/${envProdName}/values.yaml`

    const seededActions = (await Promise.all([
      gitlab.generateCreateOrUpdateAction(infraProject, 'main', devFilePath, 'old: true\n'),
      gitlab.generateCreateOrUpdateAction(infraProject, 'main', prodFilePath, 'old: true\n'),
    ])).filter((action): action is NonNullable<typeof action> => action !== null)
    await gitlab.maybeCreateCommit(infraProject, 'ci: :robot_face: Seed existing values', seededActions as CommitAction[])

    await prisma.environment.deleteMany({ where: { id: envProdId } })

    const after = await prisma.project.findUniqueOrThrow({
      where: { id: testProjectId },
      select: projectSelect,
    })

    await argocdController.handleUpsert(after)

    const updatedDev = await gitlabClient.RepositoryFiles.show(infraRepoId, devFilePath, 'main')
    const devRaw = Buffer.from(updatedDev.content, 'base64').toString('utf8')
    const devValues = parse(devRaw) as any
    expect(devValues?.common?.['dso/project.slug']).toBe(testProjectSlug)
    expect(devValues?.common?.['dso/environment']).toBe(envDevName)

    const prodFile = await gitlab.getFile(infraProject, prodFilePath, 'main')
    expect(prodFile).toBeUndefined()
  }, 72000)
})
