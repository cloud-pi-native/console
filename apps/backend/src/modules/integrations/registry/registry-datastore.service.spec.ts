import type { TestingModule } from '@nestjs/testing'
import type { DeepMockProxy } from 'vitest-mock-extended'
import { faker } from '@faker-js/faker'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import { makeProject } from '../../core/project/project-testing.utils'
import { PrismaService } from '../../infrastructure/database/prisma.service'
import { projectSelect, RegistryDatastoreService } from './registry-datastore.service'

describe('registryDatastoreService', () => {
  let service: RegistryDatastoreService
  let prisma: DeepMockProxy<PrismaService>

  beforeEach(async () => {
    prisma = mockDeep<PrismaService>()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RegistryDatastoreService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile()

    service = module.get(RegistryDatastoreService)
  })

  describe('getAllProjects', () => {
    it('queries only harbor-enabled projects, scoped to harbor plugin rows, with the shared select', async () => {
      const projects = [makeProject(), makeProject()]
      prisma.project.findMany.mockResolvedValue(projects)

      await expect(service.getAllProjects()).resolves.toEqual(projects)
      expect(prisma.project.findMany).toHaveBeenCalledWith({
        select: projectSelect,
        where: { plugins: { some: { pluginName: 'harbor' } } },
      })
    })

    it('returns an empty list when no project carries the plugin', async () => {
      prisma.project.findMany.mockResolvedValue([])

      await expect(service.getAllProjects()).resolves.toEqual([])
    })
  })

  describe('getProject', () => {
    it('queries the project by id with the shared select', async () => {
      const project = makeProject()
      prisma.project.findUnique.mockResolvedValue(project)

      await expect(service.getProject(project.id)).resolves.toEqual(project)
      expect(prisma.project.findUnique).toHaveBeenCalledWith({
        where: { id: project.id },
        select: projectSelect,
      })
    })

    it('returns null when the project is unknown', async () => {
      prisma.project.findUnique.mockResolvedValue(null)

      await expect(service.getProject(faker.string.uuid())).resolves.toBeNull()
    })
  })

  describe('getAdminPluginConfig', () => {
    it('returns the admin plugin value', async () => {
      const value = faker.internet.url()
      const pluginName = faker.word.sample()
      const key = faker.word.sample()
      prisma.adminPlugin.findUnique.mockResolvedValue({ pluginName, key, value })

      await expect(service.getAdminPluginConfig(pluginName, key)).resolves.toBe(value)
      expect(prisma.adminPlugin.findUnique).toHaveBeenCalledWith({
        where: { pluginName_key: { pluginName, key } },
        select: { value: true },
      })
    })

    it('returns null when the config entry is missing', async () => {
      prisma.adminPlugin.findUnique.mockResolvedValue(null)

      await expect(service.getAdminPluginConfig(faker.word.sample(), faker.word.sample())).resolves.toBeNull()
    })
  })
})
