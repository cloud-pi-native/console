import { Test, TestingModule } from '@nestjs/testing';
import { ProjectRouterService } from './project-router.service';

describe('ProjectRouterService', () => {
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
