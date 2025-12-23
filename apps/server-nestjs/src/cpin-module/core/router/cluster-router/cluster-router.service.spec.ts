import { Test, TestingModule } from '@nestjs/testing';
import { ClusterRouterService } from './cluster-router.service';

describe('ClusterRouterService', () => {
  let service: ClusterRouterService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ClusterRouterService],
    }).compile();

    service = module.get<ClusterRouterService>(ClusterRouterService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
