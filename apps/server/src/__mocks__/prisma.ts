import { PrismaClient } from '@prisma/client'
import { beforeEach } from 'vitest'
import { mockReset, mockDeep } from 'vitest-mock-extended'

beforeEach(() => {
  // reset les mocks
  mockReset(prisma)
})

const prisma = mockDeep<PrismaClient>()

export default prisma
