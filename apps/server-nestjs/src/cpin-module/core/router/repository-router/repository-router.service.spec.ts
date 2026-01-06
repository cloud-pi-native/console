import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

import { RepositoryRouterService } from './repository-router.service';

describe('repositoryRouterService', () => {
    let service: RepositoryRouterService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [RepositoryRouterService],
        }).compile();

        service = module.get<RepositoryRouterService>(RepositoryRouterService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});
