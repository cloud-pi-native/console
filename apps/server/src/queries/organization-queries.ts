import prisma from '@/prisma.js'
import { Organizations } from '@prisma/client'

// SELECT
export const getOrganizations = async () => {
  return prisma.organizations.findMany()
}

export const getActiveOrganizations = async () => {
  return prisma.organizations.findMany({
    where: { active: true },
  })
}

export const getOrganizationById = async (id: Organizations['id']) => {
  return prisma.organizations.findUnique({
    where: { id },
  })
}

export const getOrganizationByName = async (name: Organizations['name']) => {
  const res = await prisma.organizations.findUnique({
    where: { name },
  })
  return res
}

// CREATE
export const createOrganization = async ({ name, label, source }: { name: Organizations['name'], label: Organizations['label'], source: Organizations['source'] }) => {
  return prisma.organizations.create({ data: { name, label, source, active: true } })
}

// UPDATE
export const updateActiveOrganization = async ({ name, active }: { name: Organizations['name'], active: Organizations['active'] }) => {
  return prisma.organizations.update({ where: { name }, data: { active } })
}

export const updateLabelOrganization = async ({ name, label, source }: { name: Organizations['name'], label: Organizations['label'], source: Organizations['source'] }) => {
  return prisma.organizations.update({ where: { name }, data: { label, source } })
}

// TEC
export const _createOrganizations = async (data: Parameters<typeof prisma.organizations.create>[0]['data']) => {
  return prisma.organizations.upsert({
    where: {
      id: data.id,
    },
    create: data,
    update: data,
  })
}

export const _dropOrganizationsTable = async () => {
  await prisma.organizations.deleteMany({})
}
