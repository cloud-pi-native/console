import type { Organization, Prisma } from '@prisma/client'
import prisma from '@/prisma.js'

// SELECT
export const getOrganizations = (where?: Prisma.OrganizationWhereInput) => prisma.organization.findMany({ where })

export const getOrganizationById = (id: Organization['id']) =>
  prisma.organization.findUnique({
    where: { id },
  })

export const getOrganizationByName = (name: Organization['name']) =>
  prisma.organization.findUnique({
    where: { name },
  })

// CREATE
type CreateOrganizationParams = {
  name: Organization['name']
  label: Organization['label']
  source: Organization['source']
}

export const createOrganization = (
  { name, label, source }: CreateOrganizationParams,
) => prisma.organization.create({
  data: { name, label, source, active: true },
})

// UPDATE
type UpdateOrganizationParams = {
  name: Organization['name']
  label?: Organization['label']
  source?: Organization['source']
  active?: Organization['active']
}
export const updateOrganization = (
  { name, label, source, active }: UpdateOrganizationParams,
) => prisma.organization.update({
  where: { name },
  data: { label, source, active, updatedAt: new Date() },
})

// TEC
export const _createOrganizations = (
  data: Parameters<typeof prisma.organization.create>[0]['data'],
) =>
  prisma.organization.upsert({
    where: { id: data.id },
    create: data,
    update: data,
  })
