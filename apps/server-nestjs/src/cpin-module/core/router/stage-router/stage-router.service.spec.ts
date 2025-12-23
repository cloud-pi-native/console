import { Test, TestingModule } from '@nestjs/testing';
import { StageRouterService } from './stage-router.service';

describe('StageRouterService', () => {
  let service: StageRouterService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StageRouterService],
    }).compile();

    service = module.get<StageRouterService>(StageRouterService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
