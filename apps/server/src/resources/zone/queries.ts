import prisma from '@/prisma.js'

// GET
export const getZones = async () => prisma.zone.findMany({
  include: {
    clusters: true,
  },
})
