import { logContract } from '@cpn-console/shared';
import { faker } from '@faker-js/faker';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import app from '../../app';
import * as utilsController from '../../utils/controller';
import { getProjectMockInfos, getUserMockInfos } from '../../utils/mocks';
import * as business from './business';

vi.mock(
    'fastify-keycloak-adapter',
    (await import('../../utils/mocks')).mockSessionPlugin,
);
const authUserMock = vi.spyOn(utilsController, 'authUser');
const businessGetLogsMock = vi.spyOn(business, 'getLogs');

describe('test logContract', () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });

    describe('getLogs', () => {
        it('should return logs for admin', async () => {
            const user = getUserMockInfos(true);
            const logs = [];
            const total = 1;

            authUserMock.mockResolvedValueOnce(user);
            businessGetLogsMock.mockResolvedValueOnce([total, logs]);

            const response = await app
                .inject()
                .get(logContract.getLogs.path)
                .query({ limit: 10, offset: 0 })
                .end();

            expect(authUserMock).toHaveBeenCalledTimes(1);
            expect(businessGetLogsMock).toHaveBeenCalledTimes(1);
            expect(response.json()).toEqual({ total, logs });
            expect(response.statusCode).toEqual(200);
        });

        it('should return 403 for non-admin, no projectId', async () => {
            const user = getUserMockInfos(false);

            authUserMock.mockResolvedValueOnce(user);

            const response = await app
                .inject()
                .get(logContract.getLogs.path)
                .query({ limit: 10, offset: 0 })
                .end();

            expect(authUserMock).toHaveBeenCalledTimes(1);
            expect(businessGetLogsMock).toHaveBeenCalledTimes(0);
            expect(response.statusCode).toEqual(403);
        });

        it('should return logs for non-admin, with projectId', async () => {
            const projectPerms = getProjectMockInfos({
                projectPermissions: 1n,
            });
            const user = getUserMockInfos(false, undefined, projectPerms);
            const projectId = faker.string.uuid();

            const logs = [];
            const total = 1;

            businessGetLogsMock.mockResolvedValueOnce([total, logs]);
            authUserMock.mockResolvedValueOnce(user);

            const response = await app
                .inject()
                .get(logContract.getLogs.path)
                .query({ limit: 10, offset: 0, projectId, clean: false })
                .end();

            expect(authUserMock).toHaveBeenCalledTimes(1);
            expect(businessGetLogsMock).toHaveBeenCalledWith({
                clean: true,
                limit: 10,
                offset: 0,
                projectId,
            });
            expect(response.statusCode).toEqual(200);
        });

        it('should not return logs for non-admin, with projectId', async () => {
            const projectPerms = getProjectMockInfos({
                projectPermissions: 0n,
            });
            const user = getUserMockInfos(false, undefined, projectPerms);
            const projectId = faker.string.uuid();

            const logs = [];
            const total = 1;

            businessGetLogsMock.mockResolvedValueOnce([total, logs]);
            authUserMock.mockResolvedValueOnce(user);

            const response = await app
                .inject()
                .get(logContract.getLogs.path)
                .query({ limit: 10, offset: 0, projectId, clean: false })
                .end();

            expect(response.statusCode).toEqual(403);
        });
    });
});
