import type { TestingModule } from '@nestjs/testing'
import type { Prisma } from '@prisma/client'
import type { DeepMockProxy } from 'vitest-mock-extended'
import { faker } from '@faker-js/faker'
import { BadRequestException, NotFoundException } from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import { PrismaService } from '../infrastructure/database/prisma.service'
import { makeProject, makeProjectMembers, makeProjectRole, makeProjectRoleWithProject } from './project-roles-testing.utils'
import { ProjectRolesService } from './project-roles.service'

describe('projectRolesService', () => {
  let module: TestingModule
  let service: ProjectRolesService
  let prisma: DeepMockProxy<PrismaService>
  let events: DeepMockProxy<EventEmitter2>

  beforeEach(async () => {
    prisma = mockDeep<PrismaService>()
    events = mockDeep<EventEmitter2>()

    module = await Test.createTestingModule({
      providers: [
        ProjectRolesService,
        { provide: PrismaService, useValue: prisma },
        { provide: EventEmitter2, useValue: events },
      ],
    }).compile()

    service = module.get(ProjectRolesService)
  })

  it('lists roles with permissions as strings and stripped oidcGroup', async () => {
    const projectId = faker.string.uuid()
    const slug = 'slug'
    prisma.project.findUnique.mockResolvedValue(makeProject({ id: projectId, slug }))
    prisma.projectRole.findMany.mockResolvedValue([makeProjectRoleWithProject({
      name: 'test',
      permissions: 4n,
      position: 0,
      projectId,
      oidcGroup: '/slug/console/admin',
      project: { slug },
    })])

    const roles = await service.list(projectId)

    expect(roles[0].permissions).toBe('4')
    expect(roles[0].oidcGroup).toBe('/console/admin')
  })

  it('creates a role and emits project update', async () => {
    const projectId = faker.string.uuid()
    const slug = faker.string.alphanumeric(8).toLowerCase()
    prisma.project.findUnique.mockResolvedValueOnce(makeProject({ slug }))
    prisma.projectRole.findFirst.mockResolvedValue(makeProjectRole({ position: 0 }))
    prisma.projectRole.create.mockResolvedValue(makeProjectRole())
    prisma.projectRole.findMany.mockResolvedValue([])
    prisma.project.findUnique.mockResolvedValueOnce(makeProject({ id: projectId, slug }))

    await service.create(projectId, { name: 'test', permissions: '4' })

    expect(prisma.projectRole.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        name: 'test',
        permissions: 4n,
        position: 1,
        projectId,
      }),
    }))
    expect(events.emitAsync).toHaveBeenCalledWith('project.upsert', expect.anything())
  })

  it('rejects system role creation', async () => {
    const projectId = faker.string.uuid()
    prisma.project.findUnique.mockResolvedValueOnce(makeProject({ slug: 'slug' }))

    await expect(service.create(projectId, { name: 'test', permissions: '4', type: 'system:managed' }))
      .rejects.toThrow(BadRequestException)
  })

  it('patches roles and validates positions', async () => {
    const projectId = faker.string.uuid()
    const slug = faker.string.alphanumeric(8).toLowerCase()
    const roleId = faker.string.uuid()
    prisma.project.findUnique.mockResolvedValueOnce(makeProject({ slug }))
    prisma.projectRole.findMany.mockResolvedValue([makeProjectRoleWithProject({
      id: roleId,
      name: 'test',
      permissions: 4n,
      position: 0,
      projectId,
      oidcGroup: '/slug/console/admin',
      project: { slug },
    })])
    prisma.projectRole.update.mockResolvedValue(makeProjectRole({ id: roleId }))
    prisma.project.findUnique.mockResolvedValueOnce(makeProject({ id: projectId, slug }))

    await service.update(projectId, [{ id: roleId, name: 'updated', position: 0 }])

    expect(prisma.projectRole.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: roleId },
      data: expect.objectContaining({
        name: 'updated',
        position: 0,
      }),
    }))
  })

  it('rejects incoherent positions', async () => {
    const projectId = faker.string.uuid()
    const slug = 'slug'
    prisma.project.findUnique.mockResolvedValueOnce(makeProject({ slug }))
    const roleId1 = faker.string.uuid()
    const roleId2 = faker.string.uuid()
    prisma.projectRole.findMany.mockResolvedValue([
      makeProjectRoleWithProject({ id: roleId1, name: 'a', permissions: 1n, position: 0, projectId, oidcGroup: '', project: { slug } }),
      makeProjectRoleWithProject({ id: roleId2, name: 'b', permissions: 1n, position: 1, projectId, oidcGroup: '', project: { slug } }),
    ])

    await expect(service.update(projectId, [{ id: roleId1, position: 1 }]))
      .rejects.toThrow(BadRequestException)
  })

  it('counts role members', async () => {
    const projectId = faker.string.uuid()
    const slug = 'slug'
    const roleId1 = faker.string.uuid()
    const roleId2 = faker.string.uuid()
    prisma.project.findUnique.mockResolvedValueOnce(makeProject({ id: projectId, slug }))
    prisma.projectRole.findMany.mockResolvedValue([
      makeProjectRoleWithProject({ id: roleId1, name: 'a', permissions: 1n, position: 0, projectId, oidcGroup: '', project: { slug } }),
      makeProjectRoleWithProject({ id: roleId2, name: 'b', permissions: 1n, position: 1, projectId, oidcGroup: '', project: { slug } }),
    ])
    prisma.projectMembers.findMany.mockResolvedValue([
      makeProjectMembers({ roleIds: [roleId1, roleId2] }),
      makeProjectMembers({ roleIds: [roleId2] }),
    ])

    await expect(service.countMembers(projectId)).resolves.toEqual({
      [roleId1]: 1,
      [roleId2]: 2,
    })
  })

  it('deletes role and cleans member role ids', async () => {
    const projectId = faker.string.uuid()
    const roleId = faker.string.uuid()
    prisma.projectRole.findUnique.mockResolvedValue(makeProjectRole({ type: 'managed', projectId }))
    prisma.project.findUnique.mockResolvedValue(makeProject({ id: projectId, slug: 'slug' }))

    const tx = mockDeep<Prisma.TransactionClient>()
    tx.projectRole.delete.mockResolvedValue(makeProjectRole())
    tx.projectMembers.findMany.mockResolvedValue([
      makeProjectMembers({ userId: faker.string.uuid(), roleIds: [roleId] }),
      makeProjectMembers({ userId: faker.string.uuid(), roleIds: [roleId, faker.string.uuid()] }),
    ])
    prisma.$transaction.mockImplementation(async cb => cb(tx))

    await service.delete(roleId)

    expect(tx.projectMembers.update).toHaveBeenCalledTimes(2)
    expect(events.emitAsync).toHaveBeenCalledWith('project.upsert', expect.anything())
  })

  it('rejects system role deletion', async () => {
    prisma.projectRole.findUnique.mockResolvedValue(makeProjectRole({ type: 'system:managed', projectId: faker.string.uuid() }))

    await expect(service.delete(faker.string.uuid()))
      .rejects.toThrow(BadRequestException)
  })

  it('rejects missing role deletion', async () => {
    prisma.projectRole.findUnique.mockResolvedValue(null)

    await expect(service.delete(faker.string.uuid()))
      .rejects.toThrow(NotFoundException)
  })
})
