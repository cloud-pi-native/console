import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

import { ServiceChainRouterService } from './service-chain-router.service';

describe('serviceChainRouterService', () => {
    let service: ServiceChainRouterService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [ServiceChainRouterService],
        }).compile();

        service = module.get<ServiceChainRouterService>(
            ServiceChainRouterService,
        );
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});
