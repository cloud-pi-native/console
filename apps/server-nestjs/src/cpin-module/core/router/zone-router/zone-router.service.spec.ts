import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

import { ZoneRouterService } from './zone-router.service';

describe('zoneRouterService', () => {
    let service: ZoneRouterService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [ZoneRouterService],
        }).compile();

        service = module.get<ZoneRouterService>(ZoneRouterService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});
