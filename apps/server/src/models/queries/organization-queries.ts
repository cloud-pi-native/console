import prisma from '../../prisma'
import { Organization } from '@prisma/client'

// SELECT
export const getOrganizations = async () => {
  return prisma.organization.findMany()
}

export const getActiveOrganizations = async () => {
  return prisma.organization.findMany({
    where: { active: true },
  })
}

export const getOrganizationById = async (id: Organization['id']) => {
  return prisma.organization.findUnique({
    where: { id },
  })
}

export const getOrganizationByName = async (name: Organization['name']) => {
  const res = await prisma.organization.findUnique({
    where: { name },
  })
  return res
}

// CREATE
export const createOrganization = async ({ name, label, source }: { name: Organization['name'], label: Organization['label'], source: Organization['source'] }) => {
  return prisma.organization.create({ data: { name, label, source, active: true } })
}

// UPDATE
export const updateActiveOrganization = async ({ name, active }: { name: Organization['name'], active: Organization['active'] }) => {
  return prisma.organization.update({ where: { name }, data: { active } })
}

export const updateLabelOrganization = async ({ name, label, source }: { name: Organization['name'], label: Organization['label'], source: Organization['source'] }) => {
  return prisma.organization.update({ where: { name }, data: { label, source } })
}

// TEC
export const _createOrganizations = async ({ id, name, label, source }: { id: Organization['id'], name: Organization['name'], label: Organization['label'], source: Organization['source'] }) => {
  return prisma.organization.create({ data: { id, name, label, source, active: true } })
}

export const _dropOrganizationsTable = async () => {
  await prisma.organization.deleteMany({})
}
