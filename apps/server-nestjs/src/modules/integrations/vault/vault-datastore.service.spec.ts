import type { TestingModule } from '@nestjs/testing'
import type { DeepMockProxy } from 'vitest-mock-extended'
import { faker } from '@faker-js/faker'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import { makeProject } from '../../core/project/project-testing.utils'
import { makeZone } from '../../core/zone/zone-testing.utils'
import { PrismaService } from '../../infrastructure/database/prisma.service'
import { projectSelect, VaultDatastoreService, zoneSelect } from './vault-datastore.service'

describe('vaultDatastoreService', () => {
  let service: VaultDatastoreService
  let prisma: DeepMockProxy<PrismaService>

  beforeEach(async () => {
    prisma = mockDeep<PrismaService>()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VaultDatastoreService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile()

    service = module.get(VaultDatastoreService)
  })

  describe('getAllProjects', () => {
    it('queries all projects with the shared select', async () => {
      const projects = [makeProject(), makeProject()]
      prisma.project.findMany.mockResolvedValue(projects)

      await expect(service.getAllProjects()).resolves.toEqual(projects)
      expect(prisma.project.findMany).toHaveBeenCalledWith({ select: projectSelect })
    })
  })

  describe('getProject', () => {
    it('queries the project by id with the shared select', async () => {
      const project = makeProject()
      prisma.project.findUnique.mockResolvedValue(project)

      await expect(service.getProject(project.id)).resolves.toEqual(project)
      expect(prisma.project.findUnique).toHaveBeenCalledWith({ where: { id: project.id }, select: projectSelect })
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

  describe('getAllZones', () => {
    it('queries all zones with the shared select', async () => {
      const zones = [makeZone(), makeZone()]
      prisma.zone.findMany.mockResolvedValue(zones)

      await expect(service.getAllZones()).resolves.toEqual(zones)
      expect(prisma.zone.findMany).toHaveBeenCalledWith({ select: zoneSelect })
    })
  })
})
