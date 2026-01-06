import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

import { PluginManagementService } from './plugin-management.service';

describe('pluginManagementService', () => {
    let service: PluginManagementService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [PluginManagementService],
        }).compile();

        service = module.get<PluginManagementService>(PluginManagementService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});
