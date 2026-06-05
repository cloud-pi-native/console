import type { TestingModule } from '@nestjs/testing'
import type { DeepMockProxy } from 'vitest-mock-extended'
import { faker } from '@faker-js/faker'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { Test } from '@nestjs/testing'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import { ConfigurationModule } from '../src/modules/infrastructure/configuration/configuration.module'
import { PrismaService } from '../src/modules/infrastructure/database/prisma.service'
import { InfrastructureModule } from '../src/modules/infrastructure/infrastructure.module'
import { ProjectRolesService } from '../src/modules/project-roles/project-roles.service'
import { ProjectModule } from '../src/modules/project/project.module'

const canRunProjectRolesE2E = Boolean(process.env.E2E) && Boolean(process.env.DB_URL)

const describeWithProjectRoles = describe.runIf(canRunProjectRolesE2E)

describeWithProjectRoles('ProjectRolesService (e2e)', {}, () => {
  let moduleRef: TestingModule
  let prisma: PrismaService
  let service: ProjectRolesService
  let eventEmitter: DeepMockProxy<EventEmitter2>

  let ownerId: string
  let projectId: string
  let projectSlug: string

  beforeAll(async () => {
    eventEmitter = mockDeep<EventEmitter2>()
    eventEmitter.emitAsync.mockResolvedValue([])

    moduleRef = await Test.createTestingModule({
      imports: [ConfigurationModule, InfrastructureModule, ProjectModule],
      providers: [
        { provide: EventEmitter2, useValue: eventEmitter },
      ],
    }).compile()

    await moduleRef.init()

    prisma = moduleRef.get(PrismaService)
    service = moduleRef.get(ProjectRolesService)

    ownerId = faker.string.uuid()
    projectId = faker.string.uuid()
    projectSlug = faker.helpers.slugify(`e2e-roles-${faker.string.uuid()}`)

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
        description: 'E2E roles test project',
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
      },
    })
  })

  afterAll(async () => {
    if (prisma) {
      await prisma.projectRole.deleteMany({ where: { projectId } }).catch(() => {})
      await prisma.project.deleteMany({ where: { id: projectId } }).catch(() => {})
      await prisma.user.deleteMany({ where: { id: ownerId } }).catch(() => {})
    }

    await moduleRef?.close()

    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  it('lists roles for a project', async () => {
    const role = await prisma.projectRole.create({
      data: {
        projectId,
        name: 'admin',
        permissions: 4n,
        position: 0,
        type: 'managed',
        oidcGroup: `/${projectSlug}/admin`,
      },
    })

    const roles = await service.listRoles(projectId)

    expect(roles).toHaveLength(1)
    expect(roles[0].id).toBe(role.id)
    expect(roles[0].permissions).toBe('4')
    expect(roles[0].oidcGroup).toBe('/admin')
  })

  it('creates a role and emits project upsert', async () => {
    const role = await service.createRole(projectId, { name: 'developer', permissions: '2' })

    expect(role.length).toBeGreaterThanOrEqual(1)
    expect(events.emitAsync).toHaveBeenCalledWith('project.upsert', expect.objectContaining({ id: projectId }))

    const dbRole = await prisma.projectRole.findFirst({
      where: { projectId, name: 'developer' },
    })
    expect(dbRole).not.toBeNull()
    expect(dbRole?.permissions).toBe(2n)
  })

  it('patches roles and updates position', async () => {
    const existingRole = await prisma.projectRole.create({
      data: {
        projectId,
        name: 'tester',
        permissions: 1n,
        position: 5,
        type: 'managed',
        oidcGroup: '',
      },
    })

    const roles = await service.patchRoles(projectId, [{
      id: existingRole.id,
      name: 'qa',
      position: 2,
    }])

    const updated = roles.find(r => r.id === existingRole.id)
    expect(updated?.name).toBe('qa')
    expect(updated?.position).toBe(2)
  })

  it('counts role members', async () => {
    const roleId = faker.string.uuid()
    await prisma.projectRole.create({
      data: {
        id: roleId,
        projectId,
        name: 'counted',
        permissions: 1n,
        position: 10,
        type: 'managed',
        oidcGroup: '',
      },
    })

    const userId = faker.string.uuid()
    await prisma.user.create({
      data: {
        id: userId,
        email: faker.internet.email().toLowerCase(),
        firstName: 'Member',
        lastName: 'Test',
        type: 'human',
      },
    })

    await prisma.projectMembers.create({
      data: {
        projectId,
        userId,
        roleIds: [roleId],
      },
    })

    const counts = await service.countRolesMembers(projectId)
    expect(counts[roleId]).toBe(1)
  })

  it('deletes a role and cleans member role ids', async () => {
    const roleId = faker.string.uuid()
    const userId = faker.string.uuid()

    await prisma.projectRole.create({
      data: {
        id: roleId,
        projectId,
        name: 'to-delete',
        permissions: 1n,
        position: 20,
        type: 'managed',
        oidcGroup: '',
      },
    })

    await prisma.user.create({
      data: {
        id: userId,
        email: faker.internet.email().toLowerCase(),
        firstName: 'Delete',
        lastName: 'Test',
        type: 'human',
      },
    })

    await prisma.projectMembers.create({
      data: {
        projectId,
        userId,
        roleIds: [roleId],
      },
    })

    const result = await service.deleteRole(roleId)
    expect(result).toBeNull()

    const member = await prisma.projectMembers.findUnique({
      where: { projectId_userId: { projectId, userId } },
    })
    expect(member?.roleIds).not.toContain(roleId)
    expect(events.emitAsync).toHaveBeenCalledWith('project.upsert', expect.objectContaining({ id: projectId }))
  })
})
