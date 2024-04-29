import prisma from '@/prisma.js'

// GET
export const getZones = () =>
  prisma.zone.findMany({
    include: { clusters: true },
  })
