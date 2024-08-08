import { faker } from '@faker-js/faker'
import { describe, expect, it, vi } from 'vitest'
import prisma from '../../__mocks__/prisma.js'
import { createOrganization, fetchOrganizations, listOrganizations, updateOrganization } from './business.ts'
import { BadRequest400, NotFound404 } from '../../utils/errors.js'

vi.mock('@cpn-console/hooks', (await import('../../utils/mocks.js')).mockHooksPackage)

describe('Test organization test', () => {
  describe('listOrganizations', async () => {
    it('Should list organization', async () => {
      await listOrganizations()
      expect(prisma.organization.findMany).toHaveBeenCalledTimes(1)
    })
    it('Should list organization with query', async () => {
      await listOrganizations({ source: 'console' })
      expect(prisma.organization.findMany).toHaveBeenCalledTimes(1)
      expect(prisma.organization.findMany).toHaveBeenCalledWith({ where: { source: 'console' } })
    })
  })
  describe('createOrganization', () => {
    it('should create an organization', async () => {
      await createOrganization({ label: 'Ministère', name: 'mi', source: 'console' })
      expect(prisma.organization.create).toHaveBeenCalledTimes(1)
    })

    it('should not create an organization, conflict name', async () => {
      prisma.organization.findUnique.mockResolvedValue({ name: 'mi' })
      const response = await createOrganization({ label: 'Ministère', name: 'mi', source: 'console' })
      expect(prisma.organization.create).toHaveBeenCalledTimes(0)
      expect(response).instanceOf(BadRequest400)
    })
  })

  describe('updateOrganization', () => {
    it('should return 404', async () => {
      const response = await updateOrganization('mi', { label: 'Ministère', source: 'console' })

      expect(prisma.organization.create).toHaveBeenCalledTimes(0)
      expect(response).instanceOf(NotFound404)
    })

    it('should update organization and deactivate', async () => {
      prisma.organization.findUnique.mockResolvedValue({ name: 'mi', active: true })

      await updateOrganization('mi', { label: 'Ministère', source: 'console', active: false })

      expect(prisma.project.updateMany).toHaveBeenCalledTimes(1)
      expect(prisma.organization.update).toHaveBeenCalledTimes(1)
    })
    it('should update organization and activate', async () => {
      prisma.organization.findUnique.mockResolvedValue({ name: 'mi', active: false })

      await updateOrganization('mi', { label: 'Ministère', source: 'console', active: true })

      expect(prisma.project.updateMany).toHaveBeenCalledTimes(1)
      expect(prisma.organization.update).toHaveBeenCalledTimes(1)
    })
  })

  describe('fetchOrganizations', () => {
    // This test should be rewrite with more mocks and return
    const userId = faker.string.uuid()
    const reqId = faker.string.uuid()

    it('should interrogate hooks', async () => {
      prisma.organization.findMany.mockResolvedValue([])
      prisma.adminPlugin.findMany.mockResolvedValueOnce([])
      await fetchOrganizations(userId, reqId)
    })
  })
})
