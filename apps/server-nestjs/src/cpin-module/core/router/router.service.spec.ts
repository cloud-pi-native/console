import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

import { RouterService } from './router.service';

describe('routerService', () => {
    let service: RouterService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [RouterService],
        }).compile();

        service = module.get<RouterService>(RouterService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});
