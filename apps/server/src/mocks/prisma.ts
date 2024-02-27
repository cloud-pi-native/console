import { PrismaClient } from '@prisma/client'
import { beforeEach, vi } from 'vitest'
import { mockReset, mockDeep } from 'vitest-mock-extended'

vi.mock('../prisma.js')

beforeEach(() => {
  // reset les mocks
  mockReset(prisma)
})

const prisma = mockDeep<PrismaClient>()

export default prisma
