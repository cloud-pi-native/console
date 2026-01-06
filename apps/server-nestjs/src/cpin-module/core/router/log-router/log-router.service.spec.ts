import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

import { LogRouterService } from './log-router.service';

describe('logRouterService', () => {
    let service: LogRouterService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [LogRouterService],
        }).compile();

        service = module.get<LogRouterService>(LogRouterService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});
