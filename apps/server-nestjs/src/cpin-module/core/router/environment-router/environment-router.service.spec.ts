import { Test, TestingModule } from '@nestjs/testing';
import { EnvironmentRouterService } from './environment-router.service';

describe('EnvironmentRouterService', () => {
  let service: EnvironmentRouterService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EnvironmentRouterService],
    }).compile();

    service = module.get<EnvironmentRouterService>(EnvironmentRouterService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
