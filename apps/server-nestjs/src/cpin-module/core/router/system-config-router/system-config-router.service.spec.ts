import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

import { SystemConfigRouterService } from './system-config-router.service';

describe('systemConfigRouterService', () => {
    let service: SystemConfigRouterService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [SystemConfigRouterService],
        }).compile();

        service = module.get<SystemConfigRouterService>(
            SystemConfigRouterService,
        );
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});
