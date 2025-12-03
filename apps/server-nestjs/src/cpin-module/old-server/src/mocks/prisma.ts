import type { PrismaClient } from '@prisma/client';
import { beforeEach, vi } from 'vitest';
import { mockDeep, mockReset } from 'vitest-mock-extended';

vi.mock('../prisma.js');

const prisma = mockDeep<PrismaClient>();

beforeEach(() => {
    // reset les mocks
    mockReset(prisma);
});

export default prisma;
