import type { Organization } from '@prisma/client'
import prisma from '@/prisma.js'

// SELECT
export const getOrganizations = prisma.organization.findMany

export const getActiveOrganizationsQuery = () =>
  prisma.organization.findMany({
    where: { active: true },
  })

export const getOrganizationById = (id: Organization['id']) =>
  prisma.organization.findUnique({
    where: { id },
  })

export const getOrganizationByName = (name: Organization['name']) =>
  prisma.organization.findUnique({
    where: { name },
  })

// CREATE
type UpsertOrganizationParams = {
  name: Organization['name'],
  label: Organization['label'],
  source: Organization['source']
}

export const createOrganization = (
  { name, label, source }: UpsertOrganizationParams,
) => prisma.organization.create({
  data: { name, label, source, active: true },
})

// UPDATE
export const updateActiveOrganization = (
  { name, active }: { name: Organization['name'], active: Organization['active'] },
) => prisma.organization.update({
  where: { name },
  data: { active },
})

export const updateLabelOrganization = (
  { name, label, source }: UpsertOrganizationParams,
) => prisma.organization.update({
  where: { name },
  data: { label, source },
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

export const _dropOrganizationsTable = prisma.organization.deleteMany
