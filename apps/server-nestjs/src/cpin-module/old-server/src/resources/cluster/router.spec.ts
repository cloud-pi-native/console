import type { ClusterDetails, Environment } from '@cpn-console/shared';
import { clusterContract } from '@cpn-console/shared';
import { faker } from '@faker-js/faker';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import app from '../../app';
import * as utilsController from '../../utils/controller';
import { BadRequest400 } from '../../utils/errors';
import { getUserMockInfos } from '../../utils/mocks';
import * as business from './business';

vi.mock(
    'fastify-keycloak-adapter',
    (await import('../../utils/mocks')).mockSessionPlugin,
);
const authUserMock = vi.spyOn(utilsController, 'authUser');
const businessListMock = vi.spyOn(business, 'listClusters');
const businessGetDetailsMock = vi.spyOn(business, 'getClusterDetails');
const businessGetUsageMock = vi.spyOn(business, 'getClusterUsage');
const businessGetEnvironmentsMock = vi.spyOn(
    business,
    'getClusterAssociatedEnvironments',
);
const businessCreateMock = vi.spyOn(business, 'createCluster');
const businessUpdateMock = vi.spyOn(business, 'updateCluster');
const businessDeleteMock = vi.spyOn(business, 'deleteCluster');

describe('test clusterContract', () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });
    describe('listClusters', () => {
        it('as non admin', async () => {
            const user = getUserMockInfos(false);

            authUserMock.mockResolvedValueOnce(user);

            businessListMock.mockResolvedValueOnce([]);
            const response = await app
                .inject()
                .get(clusterContract.listClusters.path)
                .end();

            expect(businessListMock).toHaveBeenCalledWith(user.user.id);

            expect(response.json()).toStrictEqual([]);
            expect(response.statusCode).toEqual(200);
        });
        it('as admin', async () => {
            const user = getUserMockInfos(true);

            authUserMock.mockResolvedValueOnce(user);

            businessListMock.mockResolvedValueOnce([]);
            const response = await app
                .inject()
                .get(clusterContract.listClusters.path)
                .end();

            expect(businessListMock).toHaveBeenCalledWith();

            expect(response.json()).toStrictEqual([]);
            expect(response.statusCode).toEqual(200);
        });
    });

    describe('getClusterDetails', () => {
        it('should return cluster details', async () => {
            const cluster: ClusterDetails = {
                id: faker.string.uuid(),
                clusterResources: true,
                infos: '',
                external: false,
                label: faker.string.alpha(),
                privacy: 'public',
                stageIds: [],
                zoneId: faker.string.uuid(),
                cpu: faker.number.float({ min: 0, max: 10, fractionDigits: 1 }),
                gpu: faker.number.float({ min: 0, max: 10, fractionDigits: 1 }),
                memory: faker.number.float({
                    min: 0,
                    max: 10,
                    fractionDigits: 1,
                }),
                kubeconfig: {
                    cluster: { tlsServerName: faker.string.alpha() },
                    user: {},
                },
            };
            const user = getUserMockInfos(true);
            authUserMock.mockResolvedValueOnce(user);

            businessGetDetailsMock.mockResolvedValueOnce(cluster);
            const response = await app
                .inject()
                .get(
                    clusterContract.getClusterDetails.path.replace(
                        ':clusterId',
                        cluster.id,
                    ),
                )
                .end();

            expect(businessGetDetailsMock).toHaveBeenCalledTimes(1);
            expect(response.json()).toEqual(cluster);
            expect(response.statusCode).toEqual(200);
        });
        it('should return 403 if not admin', async () => {
            const user = getUserMockInfos(false);
            authUserMock.mockResolvedValueOnce(user);

            const response = await app
                .inject()
                .get(
                    clusterContract.getClusterDetails.path.replace(
                        ':clusterId',
                        faker.string.uuid(),
                    ),
                )
                .end();

            expect(businessGetDetailsMock).toHaveBeenCalledTimes(0);
            expect(response.statusCode).toEqual(403);
        });
    });

    describe('getClusterUsage', () => {
        it('should return cluster usage', async () => {
            const resources = {
                cpu: faker.number.float({ min: 0, max: 10, fractionDigits: 1 }),
                gpu: faker.number.float({ min: 0, max: 10, fractionDigits: 1 }),
                memory: faker.number.float({
                    min: 0,
                    max: 10,
                    fractionDigits: 1,
                }),
            };
            const user = getUserMockInfos(true);
            authUserMock.mockResolvedValueOnce(user);

            businessGetUsageMock.mockResolvedValueOnce(resources);
            const response = await app
                .inject()
                .get(
                    clusterContract.getClusterUsage.path.replace(
                        ':clusterId',
                        faker.string.uuid(),
                    ),
                )
                .end();

            expect(businessGetUsageMock).toHaveBeenCalledTimes(1);
            expect(response.json()).toEqual(resources);
            expect(response.statusCode).toEqual(200);
        });
        it('should return 403 if not admin', async () => {
            const user = getUserMockInfos(false);
            authUserMock.mockResolvedValueOnce(user);

            const response = await app
                .inject()
                .get(
                    clusterContract.getClusterUsage.path.replace(
                        ':clusterId',
                        faker.string.uuid(),
                    ),
                )
                .end();

            expect(businessGetUsageMock).toHaveBeenCalledTimes(0);
            expect(response.statusCode).toEqual(403);
        });
    });

    describe('getClusterEnvironments', () => {
        it('should return cluster environments', async () => {
            const envs: Environment[] = [];
            const user = getUserMockInfos(true);
            authUserMock.mockResolvedValueOnce(user);

            businessGetEnvironmentsMock.mockResolvedValueOnce(envs);
            const response = await app
                .inject()
                .get(
                    clusterContract.getClusterEnvironments.path.replace(
                        ':clusterId',
                        faker.string.uuid(),
                    ),
                )
                .end();

            expect(businessGetEnvironmentsMock).toHaveBeenCalledTimes(1);
            expect(response.json()).toEqual([]);
            expect(response.statusCode).toEqual(200);
        });
        it('should return 403 if not admin', async () => {
            const user = getUserMockInfos(false);
            authUserMock.mockResolvedValueOnce(user);

            const response = await app
                .inject()
                .get(
                    clusterContract.getClusterEnvironments.path.replace(
                        ':clusterId',
                        faker.string.uuid(),
                    ),
                )
                .end();

            expect(businessGetEnvironmentsMock).toHaveBeenCalledTimes(0);
            expect(response.statusCode).toEqual(403);
        });
    });

    describe('createCluster', () => {
        const cluster: ClusterDetails = {
            id: faker.string.uuid(),
            clusterResources: true,
            infos: '',
            external: true,
            label: faker.string.alpha(),
            privacy: 'public',
            stageIds: [],
            zoneId: faker.string.uuid(),
            cpu: faker.number.float({ min: 0, max: 10, fractionDigits: 1 }),
            gpu: faker.number.float({ min: 0, max: 10, fractionDigits: 1 }),
            memory: faker.number.float({ min: 0, max: 10, fractionDigits: 1 }),
            kubeconfig: {
                cluster: { tlsServerName: faker.string.alpha() },
                user: {},
            },
        };

        it('should return created cluster', async () => {
            const user = getUserMockInfos(true);
            authUserMock.mockResolvedValueOnce(user);

            businessCreateMock.mockResolvedValueOnce(cluster);
            const response = await app
                .inject()
                .post(clusterContract.createCluster.path)
                .body(cluster)
                .end();

            expect(response.json()).toEqual(cluster);
            expect(response.statusCode).toEqual(201);
        });
        it('should pass business error', async () => {
            const user = getUserMockInfos(true);
            authUserMock.mockResolvedValueOnce(user);

            businessCreateMock.mockResolvedValueOnce(
                new BadRequest400('une erreur'),
            );
            const response = await app
                .inject()
                .post(clusterContract.createCluster.path)
                .body(cluster)
                .end();

            expect(response.statusCode).toEqual(400);
        });
        it('should return 403 if not admin', async () => {
            const user = getUserMockInfos(false);
            authUserMock.mockResolvedValueOnce(user);

            const response = await app
                .inject()
                .post(clusterContract.createCluster.path)
                .body(cluster)
                .end();

            expect(response.statusCode).toEqual(403);
        });
    });

    describe('updateCluster', () => {
        const clusterId = faker.string.uuid();
        const cluster: Omit<ClusterDetails, 'id'> = {
            clusterResources: true,
            infos: '',
            external: false,
            label: faker.string.alpha(),
            privacy: 'public',
            stageIds: [],
            zoneId: faker.string.uuid(),
            cpu: faker.number.float({ min: 0, max: 10, fractionDigits: 1 }),
            gpu: faker.number.float({ min: 0, max: 10, fractionDigits: 1 }),
            memory: faker.number.float({ min: 0, max: 10, fractionDigits: 1 }),
            kubeconfig: {
                cluster: { tlsServerName: faker.string.alpha() },
                user: {},
            },
        };

        it('should return created cluster', async () => {
            const user = getUserMockInfos(true);
            authUserMock.mockResolvedValueOnce(user);

            businessUpdateMock.mockResolvedValueOnce({
                id: clusterId,
                ...cluster,
            });
            const response = await app
                .inject()
                .put(
                    clusterContract.updateCluster.path.replace(
                        ':clusterId',
                        clusterId,
                    ),
                )
                .body(cluster)
                .end();

            expect(response.json()).toEqual({ id: clusterId, ...cluster });
            expect(response.statusCode).toEqual(200);
        });
        it('should pass business error', async () => {
            const user = getUserMockInfos(true);
            authUserMock.mockResolvedValueOnce(user);

            businessUpdateMock.mockResolvedValueOnce(
                new BadRequest400('une erreur'),
            );
            const response = await app
                .inject()
                .put(
                    clusterContract.updateCluster.path.replace(
                        ':clusterId',
                        clusterId,
                    ),
                )
                .body(cluster)
                .end();

            expect(response.statusCode).toEqual(400);
        });
        it('should return 403 if not admin', async () => {
            const user = getUserMockInfos(false);
            authUserMock.mockResolvedValueOnce(user);

            const response = await app
                .inject()
                .put(
                    clusterContract.updateCluster.path.replace(
                        ':clusterId',
                        clusterId,
                    ),
                )
                .body(cluster)
                .end();

            expect(response.statusCode).toEqual(403);
        });
    });

    describe('deleteCluster', () => {
        it('should return empty when delete', async () => {
            const user = getUserMockInfos(true);
            authUserMock.mockResolvedValueOnce(user);

            businessDeleteMock.mockResolvedValueOnce(null);
            const response = await app
                .inject()
                .delete(
                    clusterContract.deleteCluster.path.replace(
                        ':clusterId',
                        faker.string.uuid(),
                    ),
                )
                .end();

            expect(response.body).toBeFalsy();
            expect(response.statusCode).toEqual(204);
        });
        it('should pass business error', async () => {
            const user = getUserMockInfos(true);
            authUserMock.mockResolvedValueOnce(user);

            businessDeleteMock.mockResolvedValueOnce(
                new BadRequest400('une erreur'),
            );
            const response = await app
                .inject()
                .delete(
                    clusterContract.deleteCluster.path.replace(
                        ':clusterId',
                        faker.string.uuid(),
                    ),
                )
                .end();

            expect(response.statusCode).toEqual(400);
        });
        it('should return 403 if not admin', async () => {
            const user = getUserMockInfos(false);
            authUserMock.mockResolvedValueOnce(user);

            const response = await app
                .inject()
                .delete(
                    clusterContract.deleteCluster.path.replace(
                        ':clusterId',
                        faker.string.uuid(),
                    ),
                )
                .end();

            expect(response.statusCode).toEqual(403);
        });
    });
});
