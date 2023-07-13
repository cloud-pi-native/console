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
    cluster: await prisma.cluster.findMany({
      select: {
        id: true,
        label: true,
        privacy: true,
        secretName: true,
        clusterResources: true,
        createdAt: true,
        updatedAt: true,
        kubeconfig: {
          select: {
            cluster: true,
            user: true,
          },
        },
      },
    }),
    associates: {
      cluster: await prisma.cluster.findMany({
        select: {
          id: true,
          environments: { select: { id: true } },
          projects: { select: { id: true } },
        },
      }),
    },
  })
}
// how to dump quickly...
// writeFileSync(
//   './test.json',
//   JSON.stringify(await dumpDb()),
// )
