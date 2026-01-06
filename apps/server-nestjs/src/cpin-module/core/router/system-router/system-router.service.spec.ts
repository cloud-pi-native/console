import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

import { SystemRouterService } from './system-router.service';

describe('systemRouterService', () => {
    let service: SystemRouterService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [SystemRouterService],
        }).compile();

        service = module.get<SystemRouterService>(SystemRouterService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});
