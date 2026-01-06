import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

import { ProjectServiceRouterService } from './project-service-router.service';

describe('projectServiceRouterService', () => {
    let service: ProjectServiceRouterService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [ProjectServiceRouterService],
        }).compile();

        service = module.get<ProjectServiceRouterService>(
            ProjectServiceRouterService,
        );
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});
