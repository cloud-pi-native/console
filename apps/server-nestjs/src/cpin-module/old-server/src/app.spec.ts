import { apiPrefix } from '@cpn-console/shared';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

import app from './app';
import { getRandomRequestor, setRequestor } from './utils/mocks';

vi.mock(
    'fastify-keycloak-adapter',
    (await import('./utils/mocks')).mockSessionPlugin,
);

describe('app', () => {
    beforeEach(() => {
        setRequestor(getRandomRequestor());
    });
    afterAll(async () => {
        await app.close();
    });

    it('should respond 404 on unknown route', async () => {
        const response = await app.inject().get(`${apiPrefix}/miss`);
        expect(response.statusCode).toBe(404);
    });
});
