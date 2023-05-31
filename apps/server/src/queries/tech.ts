import prisma from '@/prisma.js'

export const dumpDb = async () => {
  return ({
    organizations: await prisma.organizations.findMany({}),
    projects: await prisma.projects.findMany({}),
    users: await prisma.users.findMany({}),
    repositories: await prisma.repositories.findMany({}),
    environments: await prisma.environments.findMany({}),
    permissions: await prisma.permissions.findMany({}),
    roles: await prisma.roles.findMany({}),
    logs: await prisma.logs.findMany({}),
  })
}
