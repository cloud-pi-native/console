import { Test, TestingModule } from '@nestjs/testing';
import { ProjectRoleRouterService } from './project-role-router.service';

describe('ProjectRoleRouterService', () => {
  let service: ProjectRoleRouterService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProjectRoleRouterService],
    }).compile();

    service = module.get<ProjectRoleRouterService>(ProjectRoleRouterService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
