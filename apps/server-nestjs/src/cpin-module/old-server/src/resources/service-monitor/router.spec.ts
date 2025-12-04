import type { ServiceStatus } from '@cpn-console/hooks';
import { MonitorStatus, serviceContract } from '@cpn-console/shared';
import { describe, expect, it, vi } from 'vitest';

import app from '../../app.js';
import * as utilsController from '../../utils/controller.js';
import { getUserMockInfos } from '../../utils/mocks.js';
import * as business from './business.js';

const authUserMock = vi.spyOn(utilsController, 'authUser');

vi.mock(
    'fastify-keycloak-adapter',
    (await import('../../utils/mocks.js')).mockSessionPlugin,
);
const businessCheckMock = vi.spyOn(business, 'checkServicesHealth');
const businessRefreshMock = vi.spyOn(business, 'refreshServicesHealth');

describe('test serviceContract', () => {
    const services: ServiceStatus[] = [
        {
            interval: 1,
            lastUpdateTimestamp: 1,
            message: 'OK',
            name: 'A service',
            status: MonitorStatus.OK,
        },
    ];
    const servicesComplete: ServiceStatus[] = [
        {
            cause: 'error',
            interval: 1,
            lastUpdateTimestamp: 1,
            message: 'OK',
            name: 'A service',
            status: MonitorStatus.OK,
        },
    ];

    it('should return complete services, with cause', async () => {
        const user = getUserMockInfos(true);

        authUserMock.mockResolvedValueOnce(user);
        businessCheckMock.mockReturnValue(servicesComplete);
        const response = await app
            .inject()
            .get(serviceContract.getCompleteServiceHealth.path)
            .end();

        expect(response.json()).toStrictEqual(servicesComplete);
        expect(response.statusCode).toEqual(200);
    });

    it('should not return complete services, forbidden', async () => {
        const user = getUserMockInfos(false);

        authUserMock.mockResolvedValueOnce(user);
        businessCheckMock.mockReturnValue(servicesComplete);
        const response = await app
            .inject()
            .get(serviceContract.getCompleteServiceHealth.path)
            .end();

        expect(response.statusCode).toEqual(403);
    });

    it('should return services', async () => {
        businessCheckMock.mockReturnValue(servicesComplete);
        const response = await app
            .inject()
            .get(serviceContract.getServiceHealth.path)
            .end();

        expect(response.json()).toStrictEqual(services);
        expect(response.statusCode).toEqual(200);
    });

    it('should refresh services', async () => {
        const user = getUserMockInfos(true);

        authUserMock.mockResolvedValueOnce(user);
        businessRefreshMock.mockResolvedValue(servicesComplete);
        const response = await app
            .inject()
            .get(serviceContract.getCompleteServiceHealth.path)
            .end();

        expect(response.json()).toStrictEqual(servicesComplete);
        expect(response.statusCode).toEqual(200);
    });

    it('should refresh services, cause forbidden', async () => {
        const user = getUserMockInfos(false);

        authUserMock.mockResolvedValueOnce(user);
        businessRefreshMock.mockResolvedValue(servicesComplete);
        const response = await app
            .inject()
            .get(serviceContract.getCompleteServiceHealth.path)
            .end();

        expect(response.statusCode).toEqual(403);
    });
});
