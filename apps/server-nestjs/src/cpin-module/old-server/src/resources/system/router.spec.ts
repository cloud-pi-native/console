import { systemContract } from '@cpn-console/shared';
import { describe, expect, it, vi } from 'vitest';

import app from '../../app';

vi.mock(
    'fastify-keycloak-adapter',
    (await import('../../utils/mocks')).mockSessionPlugin,
);

describe('system - router', () => {
    it('should send application version', async () => {
        const response = await app
            .inject()
            .get(systemContract.getVersion.path)
            .end();

        expect(response.statusCode).toBe(200);
        expect(response.json()).toStrictEqual({
            version: process.env.APP_VERSION || 'dev',
        });
    });

    it('should send application health with status OK', async () => {
        const response = await app
            .inject()
            .get(systemContract.getHealth.path)
            .end();

        expect(response.statusCode).toBe(200);
        expect(response.json()).toStrictEqual({ status: 'OK' });
    });
});
