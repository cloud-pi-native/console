import prisma from '@/prisma.js'

export const dumpDb = async () => {
  return ({
    organization: await prisma.organization.findMany({}),
    project: await prisma.project.findMany({}),
    user: await prisma.user.findMany({}),
    repository: await prisma.repository.findMany({}),
    environment: await prisma.environment.findMany({}),
    permission: await prisma.permission.findMany({}),
    role: await prisma.role.findMany({}),
    log: await prisma.log.findMany({}),
    cluster: await prisma.cluster.findMany({}),
    associates: {
      cluster: {
        environment: await prisma.cluster.findMany({
          select: {
            id: true,
            environments: { select: { id: true } },
          },
        }),
        project: await prisma.cluster.findMany({
          select: {
            id: true,
            projects: { select: { id: true } },
          },
        }),
      },
    },
  })
}
