import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

import { EnvironmentRouterService } from './environment-router.service';

describe('environmentRouterService', () => {
    let service: EnvironmentRouterService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [EnvironmentRouterService],
        }).compile();

        service = module.get<EnvironmentRouterService>(
            EnvironmentRouterService,
        );
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});
