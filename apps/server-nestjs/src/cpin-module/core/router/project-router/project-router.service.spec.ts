import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

import { ProjectRouterService } from './project-router.service';

describe('projectRouterService', () => {
    let service: ProjectRouterService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [ProjectRouterService],
        }).compile();

        service = module.get<ProjectRouterService>(ProjectRouterService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});
