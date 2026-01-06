import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

import { ProjectMemberRouterService } from './project-member-router.service';

describe('projectMemberRouterService', () => {
    let service: ProjectMemberRouterService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [ProjectMemberRouterService],
        }).compile();

        service = module.get<ProjectMemberRouterService>(
            ProjectMemberRouterService,
        );
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});
