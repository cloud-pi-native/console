import { describe, expect, it } from 'vitest';

import prisma from '../../../__mocks__/prisma.js';
import { objToDb, updatePluginConfig } from './business.ts';

describe('test system/config business', () => {
    const config = { test: { key1: 'value1' } };
    it('should transform object to db row', () => {
        const response = objToDb({ test: { key1: 'value1' } });
        expect(response).toEqual([
            { pluginName: 'test', key: 'key1', value: 'value1' },
        ]);
    });
    describe('updatePluginConfig', () => {
        it('should update', async () => {
            prisma.adminPlugin.upsert.mockResolvedValue(null);
            await updatePluginConfig(config);
        });
        it('should update 0 items cause missing manifest', async () => {
            // @ts-ignore
            await updatePluginConfig({ test: { key: 1 } });
            expect(prisma.adminPlugin.upsert).toHaveBeenCalledTimes(0);
        });
    });
});
