import { beforeEach, describe, expect, it, vi } from 'vitest';

import { logger } from './app';
import { closeConnections } from './connect';
import { exitGracefully, handleExit } from './server';

vi.mock(
    'fastify-keycloak-adapter',
    (await import('./utils/mocks')).mockSessionPlugin,
);
vi.mock('./init/db/index', () => ({ initDb: vi.fn() }));
vi.mock('./connect');

process.exit = vi.fn();

vi.mock('./prepare-app', () => {
    const app = {
        listen: vi.fn(),
        close: vi.fn(async () => {}),
    };
    return {
        getPreparedApp: () => Promise.resolve(app),
    };
});
vi.spyOn(logger, 'info');
vi.spyOn(logger, 'warn');
vi.spyOn(logger, 'error');
vi.spyOn(logger, 'fatal');
vi.spyOn(logger, 'debug');

describe('server', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should call closeConnections without parameter', async () => {
        await exitGracefully();

        expect(closeConnections).toHaveBeenCalledTimes(1);
        expect(closeConnections.mock.calls[0]).toHaveLength(0);
        expect(logger.error).toHaveBeenCalledTimes(0);
    });

    it('should log an error', async () => {
        await exitGracefully(new Error('error'));

        expect(closeConnections).toHaveBeenCalledTimes(1);
        expect(closeConnections.mock.calls[0]).toHaveLength(0);
        expect(logger.fatal).toHaveBeenCalledTimes(1);
        expect(logger.fatal.mock.calls[0][0]).toBeInstanceOf(Error);
        expect(logger.info).toHaveBeenCalledTimes(2);
    });

    it('should call process.on 4 times', () => {
        const processOn = vi.spyOn(process, 'on');

        handleExit();

        expect(processOn).toHaveBeenCalledTimes(5);
    });
});
