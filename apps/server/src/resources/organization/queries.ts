import type { Organization, Prisma } from '@prisma/client'
import prisma from '@/prisma.js'

// SELECT
export const getOrganizations = (where?: Prisma.OrganizationWhereInput) => prisma.organization.findMany({ where })

export function getOrganizationById(id: Organization['id']) {
  return prisma.organization.findUnique({
    where: { id },
  })
}

export function getOrganizationByName(name: Organization['name']) {
  return prisma.organization.findUnique({
    where: { name },
  })
}

// CREATE
interface CreateOrganizationParams {
  name: Organization['name']
  label: Organization['label']
  source: Organization['source']
}

export function createOrganization({ name, label, source }: CreateOrganizationParams) {
  return prisma.organization.create({
    data: { name, label, source, active: true },
  })
}

// UPDATE
interface UpdateOrganizationParams {
  name: Organization['name']
  label?: Organization['label']
  source?: Organization['source']
  active?: Organization['active']
}
export function updateOrganization({ name, label, source, active }: UpdateOrganizationParams) {
  return prisma.organization.update({
    where: { name },
    data: { label, source, active, updatedAt: new Date() },
  })
}

// TEC
export function _createOrganizations(data: Parameters<typeof prisma.organization.create>[0]['data']) {
  return prisma.organization.upsert({
    where: { id: data.id },
    create: data,
    update: data,
  })
}
