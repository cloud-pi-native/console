import type { TestingModule } from '@nestjs/testing'
import type { DeepMockProxy } from 'vitest-mock-extended'
import { PROJECT_PERMS } from '@cpn-console/shared'
import { BadRequestException, NotFoundException } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import { PrismaService } from '../../database/prisma.service'
import { ProjectPermissionLoaderService } from './project-loader.service'
import { makeProjectRecord, makeProjectRequest } from './project.testing.utils'

const UUID = '0b3f7e58-1e2a-4c6b-9d0e-5f6a7b8c9d01'

describe('projectPermissionLoaderService', () => {
  let module: TestingModule
  let loader: ProjectPermissionLoaderService
  let prisma: DeepMockProxy<PrismaService>

  beforeEach(async () => {
    prisma = mockDeep<PrismaService>()
    module = await Test.createTestingModule({
      providers: [
        ProjectPermissionLoaderService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile()
    loader = module.get(ProjectPermissionLoaderService)
  })

  it('rejects a request without projectId nor projectSlug', async () => {
    await expect(loader.load(makeProjectRequest({}), 'user-id')).rejects.toThrow(BadRequestException)
  })

  it('rejects an unknown project', async () => {
    prisma.project.findUnique.mockResolvedValue(null)
    await expect(loader.load(makeProjectRequest({ projectId: UUID }), 'user-id')).rejects.toThrow(NotFoundException)
  })

  it('queries by slug when the projectId is not a uuid and returns only id/slug without requirements', async () => {
    prisma.project.findUnique.mockResolvedValue(makeProjectRecord())
    const project = await loader.load(makeProjectRequest({ projectId: 'my-slug' }), 'user-id')
    expect(prisma.project.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { slug: 'my-slug' } }))
    expect(project).toEqual({ id: '0b3f7e58-1e2a-4c6b-9d0e-5f6a7b8c9d01', slug: 'project-slug' })
  })

  it('queries by slug when a projectSlug param is set', async () => {
    prisma.project.findUnique.mockResolvedValue(makeProjectRecord())
    await loader.load(makeProjectRequest({ projectSlug: 'other-slug' }), 'user-id')
    expect(prisma.project.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { slug: 'other-slug' } }))
  })

  it('queries by id when the projectId is a uuid and resolves permissions when required', async () => {
    prisma.project.findUnique.mockResolvedValue(makeProjectRecord())
    const project = await loader.load(
      makeProjectRequest({ projectId: UUID }),
      'member-id',
      { includeStatus: true, includeLocked: true, includePermissions: true },
    )
    expect(prisma.project.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { id: UUID } }))
    expect(project.status).toBe('created')
    expect(project.locked).toBe(false)
    expect(project.projectPermissions).toBe(1n | PROJECT_PERMS.GUEST)
  })

  it('omits status, locked and permissions when the requirements disable them', async () => {
    prisma.project.findUnique.mockResolvedValue(makeProjectRecord())
    const project = await loader.load(
      makeProjectRequest({ projectId: UUID }),
      'member-id',
      { includeStatus: false, includeLocked: false, includePermissions: false },
    )
    expect(project.status).toBeUndefined()
    expect(project.locked).toBeUndefined()
    expect(project.projectPermissions).toBeUndefined()
  })
})
